jest.mock('../params', () => ({
  config: {
    explorerWizard: {
      guides: {
        dictionary: {
          steps: [{ content: 'Dictionary guide', target: '#dictionary' }],
        },
      },
    },
  },
}));

const {
  OPEN_EXPLORER_WIZARD_EVENT,
  isExplorerSubGuideEnabled,
  openExplorerSubGuide,
} = require('./ExplorerWizard');

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
