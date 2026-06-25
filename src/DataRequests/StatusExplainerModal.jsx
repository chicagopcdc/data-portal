import * as dagre from '@dagrejs/dagre';

import './StatusExplainerModal.css';

const BOX_WIDTH = 165;
const BOX_HEIGHT = 58;
const START_WIDTH = 70;
const START_HEIGHT = 30;
const PADDING = 32;
const RANK_SEPARATION = 60;
const NODE_SEPARATION = 42;

const getPath = (points) => {
  if (!points?.length) {
    return '';
  }

  return points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x + PADDING} ${
          point.y + PADDING
        }`,
    )
    .join(' ');
};

const getTransitionLabelSize = (label) => {
  if (!label) {
    return {
      width: 0,
      height: 0,
    };
  }

  return {
    width: Math.max(80, label.length * 8),
    height: 24,
  };
};

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

  const graph = new dagre.graphlib.Graph({
    multigraph: true,
  });

  graph.setGraph({
    rankdir: 'LR',
    ranksep: RANK_SEPARATION,
    nodesep: NODE_SEPARATION,
    marginx: 0,
    marginy: 0,
  });

  graph.setDefaultEdgeLabel(() => ({}));

  const nodes = [
    {
      id: 'start',
      label: 'START',
      isStart: true,
    },
    ...states,
  ];

  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: node.isStart ? START_WIDTH : BOX_WIDTH,
      height: node.isStart ? START_HEIGHT : BOX_HEIGHT,
    });
  });

  transitions.forEach((transition, index) => {
    if (
      graph.hasNode(transition.from) &&
      graph.hasNode(transition.to)
    ) {

      const hasVisibleLabel =
        transition.label && transition.from !== 'start';

      const labelSize = getTransitionLabelSize(
        hasVisibleLabel ? transition.label : null,
      );

      graph.setEdge(
        transition.from,
        transition.to,
        {
          transition,
          width: labelSize.width,
          height: labelSize.height,
          labelpos: 'c',
        },
        `${transition.from}-${transition.to}-${index}`,
      );
    }
  });

  dagre.layout(graph);

  const positionedNodes = nodes.map((node) => ({
    ...node,
    ...graph.node(node.id),
  }));

  const positionedTransitions = graph.edges().map((edge) => {
    const edgeData = graph.edge(edge);

    return {
      id: edge.name,
      transition: edgeData.transition,
      points: edgeData.points || [],
      labelPosition: edgeData.transition.label
        && edgeData.transition.from !== 'start'
        ? {
            left: edgeData.x + PADDING,
            top: edgeData.y + PADDING,
          }
        : null,
    };
  });

  const graphSize = graph.graph();
  const diagramWidth = graphSize.width + PADDING * 2;
  const diagramHeight = graphSize.height + PADDING * 2;

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

        <div className='status-flow-diagram-wrapper'>
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

              {positionedTransitions.map(({ id, points }) => (
                <path
                  key={id}
                  d={getPath(points)}
                  className='status-flow-diagram__arrow-line'
                  markerEnd='url(#status-flow-arrowhead)'
                />
              ))}
            </svg>

            {positionedNodes.map((node) => (
              <div
                key={node.id}
                className={
                  node.isStart
                    ? 'status-flow-diagram__start'
                    : 'status-flow-diagram__state'
                }
                style={{
                  left: PADDING + node.x - node.width / 2,
                  top: PADDING + node.y - node.height / 2,
                }}
              >
                {node.label}
              </div>
            ))}

            {positionedTransitions.map(({ id, transition, labelPosition }) => {
              if (!labelPosition) {
                return null;
              }

              return (
                <div
                  key={`${id}-label`}
                  className='status-flow-diagram__transition-label'
                  style={labelPosition}
                >
                  {transition.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
