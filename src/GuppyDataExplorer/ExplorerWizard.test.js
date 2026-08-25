jest.mock('../params', () => ({
  config: {
    explorerWizard: {
      guides: {
        intro: {
          version: 2,
          steps: [{ content: 'Intro guide', target: '#intro' }],
        },
        dictionary: {
          version: 1,
          steps: [{ content: 'Dictionary guide', target: '#dictionary' }],
        },
      },
    },
  },
}));

const {
  getExplorerWizardVersion,
  OPEN_EXPLORER_WIZARD_EVENT,
  isExplorerSubGuideEnabled,
  openExplorerSubGuide,
} = require('./ExplorerWizard');

test('reads the automatic guide version from the intro guide', () => {
  expect(getExplorerWizardVersion()).toBe(2);
});

test('reports whether a configured sub-guide is available', () => {
  expect(isExplorerSubGuideEnabled('dictionary')).toBe(true);
  expect(isExplorerSubGuideEnabled('unknown')).toBe(false);
});

test('opens only the requested sub-guide through the wizard event', () => {
  const listener = jest.fn();
  window.addEventListener(OPEN_EXPLORER_WIZARD_EVENT, listener);

  openExplorerSubGuide('dictionary');

  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0][0].detail).toEqual({ guideId: 'dictionary' });
  window.removeEventListener(OPEN_EXPLORER_WIZARD_EVENT, listener);
});
