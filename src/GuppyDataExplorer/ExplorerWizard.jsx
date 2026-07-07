import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { config } from '../params';
import './ExplorerWizard.css';

export const ONBOARDING_VERSION_FIELD = 'onboardingVersionSeen';
export const OPEN_EXPLORER_WIZARD_EVENT = 'pcdc-open-explorer-wizard';

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

function getConfiguredSteps() {
  const configuredSteps = config.explorerWizard?.steps;
  return Array.isArray(configuredSteps) ? configuredSteps : [];
}

export function getExplorerWizardVersion() {
  const version = Number(config.explorerWizard?.version);
  return Number.isFinite(version) && version > 0 ? version : null;
}

export function isExplorerWizardEnabled() {
  return getExplorerWizardVersion() !== null && getConfiguredSteps().length > 0;
}

export function hasSeenExplorerWizard(user) {
  const wizardVersion = getExplorerWizardVersion();
  const seenVersion = Number(
    user?.additional_info?.[ONBOARDING_VERSION_FIELD],
  );

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

/** @param {{ isOpen: boolean, onClose: () => void, onDone: () => void }} props */
function ExplorerWizard({ isOpen, onClose, onDone }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [rects, setRects] = useState([]);
  const [popover, setPopover] = useState(null);
  const steps = useMemo(getConfiguredSteps, []);
  const step = steps[stepIndex];

  const targetSelectors = useMemo(() => step?.target ?? [], [step]);

  function completeWizard() {
    onDone();
    onClose();
  }

  function updateLayout(shouldScroll = false, shouldShowFallback = true) {
    const elements = getElements(targetSelectors);
    const nextRects = getRects(elements);
    setRects(nextRects);

    if (nextRects.length === 0) {
      if (shouldShowFallback)
        setPopover({
          arrowLeft: null,
          arrowPosition: null,
          left: Math.max(20, window.innerWidth / 2 - 340),
          top: Math.max(20, window.innerHeight / 2 - 140),
          width: Math.min(760, window.innerWidth - 40),
        });
      return false;
    }

    const first = nextRects[0];
    if (shouldScroll)
      elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPopover(
      getPopoverPosition({
        ...first,
        bottom: first.top + first.height,
      }),
    );
    return true;
  }

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step === undefined) return undefined;

    setPopover(null);
    if (step.route) {
      const nextRoute = getRouteWithMergedSearch(step.route, location);
      if (!isCurrentRoute(step.route, location))
        navigate(`${nextRoute.path}${nextRoute.search}`);
    }

    const retryTimeouts = [];
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

    function updateLayoutWhenReady(remainingAttempts = 40) {
      if (expandStepTargets()) {
        retryTimeouts.push(
          window.setTimeout(
            () => updateLayoutWhenReady(remainingAttempts),
            120,
          ),
        );
        return;
      }
      const foundTarget = updateLayout(true, remainingAttempts === 0);
      if (!foundTarget && remainingAttempts > 0) {
        retryTimeouts.push(
          window.setTimeout(
            () => updateLayoutWhenReady(remainingAttempts - 1),
            250,
          ),
        );
      }
    }

    const timeout = window.setTimeout(
      () => {
        if (step.clickTarget) document.querySelector(step.clickTarget)?.click();
        retryTimeouts.push(
          window.setTimeout(updateLayoutWhenReady, step.delay ?? 300),
        );
      },
      step.route ? 300 : 120,
    );
    window.addEventListener('resize', updateLayout);
    window.addEventListener('scroll', updateLayout, true);

    return () => {
      window.clearTimeout(timeout);
      retryTimeouts.forEach((id) => window.clearTimeout(id));
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
            <button
              className='explorer-wizard__next'
              onClick={() =>
                isLastStep ? completeWizard() : setStepIndex((i) => i + 1)
              }
              type='button'
            >
              {isLastStep
                ? 'Done'
                : `Next (Step ${stepIndex + 1} of ${steps.length})`}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

ExplorerWizard.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default ExplorerWizard;
