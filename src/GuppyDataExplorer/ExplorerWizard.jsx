import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { config } from '../params';
import './ExplorerWizard.css';

export const ONBOARDING_VERSION_FIELD = 'onboardingVersionSeen';
export const OPEN_EXPLORER_WIZARD_EVENT = 'pcdc-open-explorer-wizard';
const LAYOUT_RETRY_DELAY = 50;

function getElements(selectors) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  return selectorList
    .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
    .filter(Boolean);
}

function getRects(elements) {
  return elements
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    }));
}

function getPopoverPosition(rect) {
  const margin = 20;
  const width = Math.min(760, window.innerWidth - margin * 2);
  const left = Math.min(
    Math.max(margin, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - margin,
  );
  const preferBelow = rect.bottom + 250 < window.innerHeight;
  const top = preferBelow
    ? Math.min(rect.bottom + margin, window.innerHeight - 250)
    : Math.max(margin, rect.top - 250);
  const arrowLeft = Math.min(
    Math.max(28, rect.left + rect.width / 2 - left),
    width - 28,
  );

  return {
    arrowLeft,
    arrowPosition: preferBelow ? 'top' : 'bottom',
    left,
    top,
    width,
  };
}

function getConfiguredGuide(guideId = null) {
  const configuredGuideId = guideId || 'intro';
  return config.explorerWizard?.guides?.[configuredGuideId];
}

function getConfiguredSteps(guideId = null) {
  const configuredSteps = getConfiguredGuide(guideId)?.steps;
  return Array.isArray(configuredSteps) ? configuredSteps : [];
}

export function isExplorerSubGuideEnabled(guideId) {
  return getConfiguredSteps(guideId).length > 0;
}

export function openExplorerSubGuide(guideId) {
  window.dispatchEvent(
    new CustomEvent(OPEN_EXPLORER_WIZARD_EVENT, { detail: { guideId } }),
  );
}

export function getExplorerWizardVersion() {
  const version = Number(getConfiguredGuide()?.version);
  return Number.isFinite(version) && version > 0 ? version : null;
}

export function isExplorerWizardEnabled() {
  return getExplorerWizardVersion() !== null && getConfiguredSteps().length > 0;
}

export function hasSeenExplorerWizard(user) {
  const wizardVersion = getExplorerWizardVersion();
  const seenVersion = Number(user?.additional_info?.[ONBOARDING_VERSION_FIELD]);

  return (
    wizardVersion === null ||
    (Number.isFinite(seenVersion) && seenVersion >= wizardVersion)
  );
}

function getRouteWithMergedSearch(route, location) {
  const routeUrl = new URL(route, window.location.origin);
  const nextSearchParams = new URLSearchParams(location.search);
  routeUrl.searchParams.forEach((value, key) => {
    nextSearchParams.set(key, value);
  });

  const nextSearch = nextSearchParams.toString();
  return {
    path: routeUrl.pathname,
    search: nextSearch ? `?${decodeURIComponent(nextSearch)}` : '',
  };
}

function isCurrentRoute(route, location) {
  const routeUrl = new URL(route, window.location.origin);
  if (location.pathname !== routeUrl.pathname) return false;

  const currentSearchParams = new URLSearchParams(location.search);
  return Array.from(routeUrl.searchParams.entries()).every(
    ([key, value]) => currentSearchParams.get(key) === value,
  );
}

/** @param {{ guideId?: string, isOpen: boolean, onClose: () => void, onDone?: () => void }} props */
function ExplorerWizard({ guideId = null, isOpen, onClose, onDone }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [rects, setRects] = useState([]);
  const [popover, setPopover] = useState(null);
  const layoutSignature = useRef('');
  const steps = useMemo(() => getConfiguredSteps(guideId), [guideId]);
  const step = steps[stepIndex];

  const targetSelectors = useMemo(() => step?.target ?? [], [step]);

  function completeWizard() {
    onDone?.();
    onClose();
  }

  function updateLayout(shouldScroll = false, shouldShowFallback = true) {
    const elements = getElements(targetSelectors);
    const nextRects = getRects(elements);
    if (nextRects.length === 0) {
      if (shouldShowFallback) {
        const nextPopover = {
          arrowLeft: null,
          arrowPosition: null,
          left: Math.max(20, window.innerWidth / 2 - 340),
          top: Math.max(20, window.innerHeight / 2 - 140),
          width: Math.min(760, window.innerWidth - 40),
        };
        const nextSignature = JSON.stringify([[], nextPopover]);
        if (layoutSignature.current !== nextSignature) {
          layoutSignature.current = nextSignature;
          setRects([]);
          setPopover(nextPopover);
        }
      }
      return false;
    }

    const first = nextRects[0];
    if (shouldScroll)
      elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    const nextPopover = getPopoverPosition({
      ...first,
      bottom: first.top + first.height,
    });
    const nextSignature = JSON.stringify([nextRects, nextPopover]);
    if (layoutSignature.current !== nextSignature) {
      layoutSignature.current = nextSignature;
      setRects(nextRects);
      setPopover(nextPopover);
    }
    return true;
  }

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step === undefined) return undefined;

    layoutSignature.current = '';
    setRects([]);
    setPopover(null);
    // Manually opened guides respond immediately. Once the automatic intro is
    // underway, same-page steps can do the same; its first step and any step
    // that navigates still wait for the page to settle before showing overlay.
    const isStepOnCurrentPage =
      !step.route || isCurrentRoute(step.route, location);
    if (guideId || (stepIndex > 0 && isStepOnCurrentPage))
      updateLayout(false, true);
    if (step.route) {
      const nextRoute = getRouteWithMergedSearch(step.route, location);
      if (!isCurrentRoute(step.route, location))
        navigate(`${nextRoute.path}${nextRoute.search}`);
    }

    const retryTimeouts = [];
    let animationFrame = null;
    let didRequestScroll = false;
    let previousTargetSignature = '';
    let stableMeasurements = 0;
    function expandStepTargets() {
      let didExpand = false;
      getElements(step.expandTargets ?? []).forEach((element) => {
        const toggle = element.matches('[data-tour-filter-toggle]')
          ? element
          : element.querySelector('[data-tour-filter-toggle]');
        if (toggle?.getAttribute('aria-label')?.startsWith('Expand')) {
          toggle.click();
          didExpand = true;
        }
      });
      return didExpand;
    }

    function trackLayout() {
      updateLayout(false, false);
      animationFrame = window.requestAnimationFrame(trackLayout);
    }

    function retryWhenReady(remainingAttempts) {
      retryTimeouts.push(
        window.setTimeout(
          () => updateLayoutWhenReady(remainingAttempts),
          LAYOUT_RETRY_DELAY,
        ),
      );
    }

    function updateLayoutWhenReady(remainingAttempts = 40) {
      if (expandStepTargets()) {
        retryWhenReady(remainingAttempts);
        return;
      }

      const elements = getElements(targetSelectors);
      const nextRects = getRects(elements);
      if (nextRects.length === 0) {
        if (remainingAttempts > 0) retryWhenReady(remainingAttempts - 1);
        else updateLayout(false, true);
        return;
      }

      if (!didRequestScroll) {
        elements[0].scrollIntoView({ behavior: 'auto', block: 'center' });
        didRequestScroll = true;
        retryWhenReady(remainingAttempts);
        return;
      }

      const nextTargetSignature = JSON.stringify(nextRects);
      stableMeasurements =
        nextTargetSignature === previousTargetSignature
          ? stableMeasurements + 1
          : 0;
      previousTargetSignature = nextTargetSignature;

      if (stableMeasurements < 1 && remainingAttempts > 0) {
        retryWhenReady(remainingAttempts - 1);
        return;
      }

      updateLayout(false, true);
      animationFrame = window.requestAnimationFrame(trackLayout);
    }

    const timeout = window.setTimeout(
      () => {
        if (step.clickTarget) document.querySelector(step.clickTarget)?.click();
        retryTimeouts.push(
          window.setTimeout(updateLayoutWhenReady, step.delay ?? 100),
        );
      },
      step.route ? 150 : 50,
    );
    window.addEventListener('resize', updateLayout);
    window.addEventListener('scroll', updateLayout, true);

    return () => {
      window.clearTimeout(timeout);
      retryTimeouts.forEach((id) => window.clearTimeout(id));
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('scroll', updateLayout, true);
    };
  }, [isOpen, stepIndex, location.pathname, location.search]);

  if (!isOpen || popover === null || step === undefined) return null;

  const isLastStep = stepIndex === steps.length - 1;

  return (
    <div className='explorer-wizard' aria-live='polite'>
      <div className='explorer-wizard__overlay' />
      {rects.map((rect, index) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className='explorer-wizard__highlight'
          style={{
            height: rect.height + 18,
            left: rect.left - 9,
            top: rect.top - 9,
            width: rect.width + 18,
          }}
        />
      ))}
      <section
        className={`explorer-wizard__card${
          popover.arrowPosition
            ? ` explorer-wizard__card--arrow-${popover.arrowPosition}`
            : ''
        }`}
        style={{
          '--explorer-wizard-arrow-left':
            popover.arrowLeft === null ? undefined : `${popover.arrowLeft}px`,
          left: popover.left,
          top: popover.top,
          width: popover.width,
        }}
      >
        <button
          aria-label='Close guide'
          className='explorer-wizard__close'
          onClick={onClose}
          type='button'
        />
        <p>{step.content}</p>
        <footer>
          <button
            className='explorer-wizard__skip'
            onClick={onClose}
            type='button'
          >
            Skip
          </button>
          <div className='explorer-wizard__actions'>
            {stepIndex > 0 && (
              <button
                className='explorer-wizard__back'
                onClick={() => setStepIndex((i) => i - 1)}
                type='button'
              >
                Back
              </button>
            )}
            {!isLastStep && (
              <button
                className='explorer-wizard__next'
                onClick={() => setStepIndex((i) => i + 1)}
                type='button'
              >
                {`Next (Step ${stepIndex + 1} of ${steps.length})`}
              </button>
            )}
            <button
              className='explorer-wizard__done'
              onClick={completeWizard}
              type='button'
            >
              Done
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

ExplorerWizard.propTypes = {
  guideId: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func,
};

export default ExplorerWizard;
