import './StatusExplainerModal.css';

const COLUMN_WIDTH = 185;
const ROW_HEIGHT = 92;
const BOX_WIDTH = 165;
const BOX_HEIGHT = 58;
const PADDING = 32;

export default function StatusExplainerModal({
  isOpen,
  onClose,
  statusFlow,
}) {
  if (!isOpen) {
    return null;
  }

  const states = statusFlow?.states || [];
  const transitions = statusFlow?.transitions || [];

  const getState = (id) => {
    if (id === 'start') {
      return {
        id: 'start',
        label: 'START',
        x: 1,
        y: 1.35,
        isStart: true,
      };
    }

    return states.find((state) => state.id === id);
  };

  const getBoxCenter = (state) => {
    if (!state) {
      return null;
    }
    return {
      x: PADDING + (state.x - 1) * COLUMN_WIDTH + BOX_WIDTH / 2,
      y: PADDING + (state.y - 1) * ROW_HEIGHT + BOX_HEIGHT / 2,
    };
  };

  const getArrowPoints = (fromState, toState) => {
    const from = getBoxCenter(fromState);
    const to = getBoxCenter(toState);
    if (!from || !to) {
      return null;
    }

    const isHorizontal = fromState.y === toState.y;
    const isVertical = fromState.x === toState.x;

    if (isHorizontal) {
      if (to.x > from.x) {
        return {
          x1: from.x + BOX_WIDTH / 2,
          y1: from.y,
          x2: to.x - BOX_WIDTH / 2,
          y2: to.y,
        };
      }

      return {
        x1: from.x - BOX_WIDTH / 2,
        y1: from.y,
        x2: to.x + BOX_WIDTH / 2,
        y2: to.y,
      };
    }

    if (isVertical) {
      if (to.y > from.y) {
        return {
          x1: from.x,
          y1: from.y + BOX_HEIGHT / 2,
          x2: to.x,
          y2: to.y - BOX_HEIGHT / 2,
        };
      }

      return {
        x1: from.x,
        y1: from.y - BOX_HEIGHT / 2,
        x2: to.x,
        y2: to.y + BOX_HEIGHT / 2,
      };
    }

    return {
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    };
  };

  const diagramWidth = PADDING * 2 + 7 * COLUMN_WIDTH;
  const diagramHeight = PADDING * 2 + 5 * ROW_HEIGHT + 20;

  return (
    <div className='status-explainer-modal__overlay'>
      <div className='status-explainer-modal'>
        <div className='status-explainer-modal__header'>
          <h2>Status Flow</h2>
          <button
            type='button'
            className='status-explainer-modal__close-button'
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div 
          className='status-flow-diagram'
          style={{
            width: diagramWidth,
            height: diagramHeight,
          }}
        >
          <svg
            className='status-flow-diagram__arrows'
            width={diagramWidth}
            height={diagramHeight}
          >
            <defs>
              <marker
                id='status-flow-arrowhead'
                markerWidth='10'
                markerHeight='10'
                refX='8'
                refY='3'
                orient='auto'
                markerUnits='strokeWidth'
              >
                <path d='M0,0 L0,6 L9,3 z' />
              </marker>
            </defs>

            {transitions.map((transition) => {
              const fromState = getState(transition.from);
              const toState = getState(transition.to);

              if (!fromState || !toState) {
                return null;
              }

              const points = getArrowPoints(fromState, toState);

              if(!points) {
                return null;
              }

              let path;

              if (transition.from === 'start' && transition.to === 'draft') {
                const draftTopX = PADDING + (toState.x - 1) * COLUMN_WIDTH + BOX_WIDTH / 2;
                const draftTopY = PADDING + (toState.y - 1) * ROW_HEIGHT;
                const startY = draftTopY - 45;

                path = `M ${draftTopX} ${startY} L ${draftTopX} ${draftTopY}`;
              } else if (transition.from === 'in_review' && transition.to === 'in_revision') {
                const x = points.x1 + 40;
                path = `M ${x} ${points.y1} L ${x} ${points.y2}`;
              } else if (transition.from === 'in_revision' && transition.to === 'in_review') {
                const x = points.x1 - 40;
                path = `M ${x} ${points.y1} L ${x} ${points.y2}`;
              } else if (transition.from === 'in_review' && transition.to === 'withdrawn') {
                const endX = PADDING + (toState.x - 1) * COLUMN_WIDTH + BOX_WIDTH / 2;
                const endY = PADDING + (toState.y - 1) * ROW_HEIGHT;
                const startX = endX;
                const startY = PADDING + (fromState.y - 1) * ROW_HEIGHT + BOX_HEIGHT / 2;

                path = `M ${startX} ${startY} L ${endX} ${endY}`;
              } else if (transition.from === 'in_revision' && transition.to === 'withdrawn') {
                const startX = PADDING + (fromState.x - 1) * COLUMN_WIDTH + 55;
                const startY = PADDING + (fromState.y - 1) * ROW_HEIGHT + BOX_HEIGHT / 2;
                const endX = PADDING + (toState.x - 1) * COLUMN_WIDTH + BOX_WIDTH;
                const endY = PADDING + (toState.y - 1) * ROW_HEIGHT + BOX_HEIGHT / 2;
                const midX = PADDING + (fromState.x - 1) * COLUMN_WIDTH + 80;

                path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
              } else if (transition.from === 'in_review' && transition.to === 'approved') {
                path = `M ${points.x1} ${points.y1} L ${points.x2} ${points.y2}`;
              } else if (transition.from === 'in_review' && transition.to === 'approved_with_feedback') {
                const branchX = PADDING + (fromState.x - 1) * COLUMN_WIDTH + BOX_WIDTH + 130;
                const startY = PADDING + (fromState.y - 1) * ROW_HEIGHT + BOX_HEIGHT / 2;
                const endY = PADDING + (toState.y - 1) * ROW_HEIGHT + BOX_HEIGHT / 2;
                const endX = PADDING + (toState.x - 1) * COLUMN_WIDTH;

                path = `M ${branchX} ${startY} L ${branchX} ${endY} L ${endX} ${endY}`;
              } else if (transition.from === 'contracting_requirements_met' && transition.to === 'data_available') {
                const x = points.x1;
                path = `M ${x} ${points.y1} L ${x} ${points.y2}`;
              } else if (points.x1 === points.x2 || points.y1 === points.y2) {
                path = `M ${points.x1} ${points.y1} L ${points.x2} ${points.y2}`;
              } else {
                path = `M ${points.x1} ${points.y1} L ${(points.x1 + points.x2) / 2} ${points.y1} L ${(points.x1 + points.x2) / 2} ${points.y2} L ${points.x2} ${points.y2}`;
              }

              return (
                <path
                  key={`${transition.from}-${transition.to}`}
                  d={path}
                  className='status-flow-diagram__arrow-line'
                  markerEnd='url(#status-flow-arrowhead)'
                />
              );
            })}
          </svg>

          <div className='status-flow-diagram__start'>
            START
          </div>

          {states.map((state) => (
            <div
              key={state.id}
              className='status-flow-diagram__state'
              style={{
                left: PADDING + (state.x - 1) * COLUMN_WIDTH,
                top: PADDING + (state.y - 1) * ROW_HEIGHT,
              }}
            >
              {state.label}
            </div>
          ))}

          {transitions.map((transition) => {
            if (!transition.label || transition.from === 'start') {
              return null;
            }

            const fromState = getState(transition.from);
            const toState = getState(transition.to);

            if (!fromState || !toState) {
              return null;
            }

            const from = getBoxCenter(fromState);
            const to = getBoxCenter(toState);

            if (!from || !to) {
              return null;
            }

            return (
              <div
                key={`${transition.from}-${transition.to}-label`}
                className='status-flow-diagram__transition-label'
                style={{
                  left:
                    transition.from === 'in_review' && transition.to === 'in_revision'
                      ? PADDING + (fromState.x - 1) * COLUMN_WIDTH + BOX_WIDTH + 40
                      : transition.from === 'in_revision' && transition.to === 'in_review'
                        ? PADDING + (fromState.x - 1) * COLUMN_WIDTH + 10
                        : transition.from === 'in_review' && transition.to === 'withdrawn'
                          ? PADDING + (toState.x - 1) * COLUMN_WIDTH + BOX_WIDTH / 2
                          : (from.x + to.x) / 2,
                  top:
                    transition.from === 'in_review' && transition.to === 'in_revision'
                      ? (from.y + to.y) / 2
                      : transition.from === 'in_revision' && transition.to === 'in_review'
                        ? (from.y + to.y) / 2
                        : transition.from === 'in_review' && transition.to === 'withdrawn'
                          ? (from.y + to.y) / 2
                          : (from.y + to.y) / 2,
                }}
              >
                {transition.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
