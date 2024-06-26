import { Children, Component, cloneElement, createRef } from 'react';
import PropTypes from 'prop-types';
import { select } from 'd3-selection';
import { transition } from 'd3-transition';
import { easeLinear } from 'd3-ease';
import { zoom, zoomTransform, zoomIdentity } from 'd3-zoom';

import './Canvas.css';

const d3 = {
  select,
  zoom,
  zoomTransform,
  zoomIdentity,
  transition,
  easeLinear,
};

function getTransition() {
  return d3.transition().duration(150).ease(d3.easeLinear);
}

class Canvas extends Component {
  constructor(props) {
    super(props);
    this.state = {
      canvasWidth: 0,
      canvasHeight: 0,
    };
    this.canvasElement = createRef();
    this.svgElement = createRef();
    this.containerElement = createRef();
  }

  componentDidMount() {
    this.zoomBehavior = d3
      .zoom()
      .scaleExtent([this.props.minZoom, this.props.maxZoom])
      .translateExtent([
        this.props.topLeftTranslateLimit,
        this.props.bottomRightTranslateLimit,
      ])
      .on('zoom', (event) => {
        this.handleCanvasUpdate();
        this.zoomTarget.attr('transform', event.transform);
      });
    this.zoomTarget = d3.select('.canvas__container');
    this.zoomCatcher = d3
      .select('.canvas__overlay')
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .call(this.zoomBehavior);
    this.updateCanvasSize();
    window.addEventListener('resize', this.handleResize);
  }

  componentDidUpdate() {
    if (this.props.needReset) {
      this.handleReset();
      this.props.onResetCanvasFinished();
    }
  }

  componentWillUnmount() {
    d3.select('.canvas__overlay').on('.zoom', null);
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    if (this.props.isGraphView) {
      this.updateCanvasSize();
    }
  };

  handleCanvasUpdate = () => {
    const canvasBoundingRect = this.canvasElement.current.getBoundingClientRect();
    this.props.onCanvasBoundingBoxUpdate(canvasBoundingRect);
  };

  handleClick = () => {
    this.props.onClickBlankSpace();
  };

  zoomAction = (k) => {
    const transform = d3.zoomTransform(this.zoomCatcher.node());

    // if zoomin (k>1), translate toward negative direction, if zoomout, toward positive
    const translateSign = k > 1 ? -1 : +1;

    this.zoomCatcher
      .transition(getTransition())
      .call(
        this.zoomBehavior.transform,
        transform
          .translate(
            translateSign * (this.state.canvasWidth / 2) * Math.abs(k - 1),
            translateSign * (this.state.canvasHeight / 2) * Math.abs(k - 1)
          )
          .scale(k)
      );
  };

  handleZoomIn = () => {
    this.zoomAction(1.2);
  };

  handleZoomOut = () => {
    this.zoomAction(0.8);
  };

  handleReset = () => {
    this.zoomCatcher
      .transition(getTransition())
      .call(this.zoomBehavior.transform, d3.zoomIdentity);
  };

  updateCanvasSize() {
    this.setState({
      canvasWidth: this.canvasElement.current.clientWidth,
      canvasHeight: this.canvasElement.current.clientHeight,
    });
    this.handleCanvasUpdate();
  }

  render() {
    return (
      <div
        className='canvas'
        ref={this.canvasElement}
        style={{ width: '100%', height: '100%' }}
      >
        <div className='canvas__zoom-button-group'>
          <div
            className='canvas__zoom-button canvas__zoom-button--reset'
            onClick={this.handleReset}
            onKeyPress={(e) => {
              if (e.charCode === 13 || e.charCode === 32) {
                e.preventDefault();
                this.handleReset();
              }
            }}
            role='button'
            tabIndex={0}
            aria-label='Reset zoom'
          >
            <i className='canvas__zoom-icon g3-icon g3-icon--reset' />
          </div>
          <div
            className='canvas__zoom-button canvas__zoom-button--zoom-in'
            onClick={this.handleZoomIn}
            onKeyPress={(e) => {
              if (e.charCode === 13 || e.charCode === 32) {
                e.preventDefault();
                this.handleZoomIn();
              }
            }}
            role='button'
            tabIndex={0}
            aria-label='Zoom in'
          >
            <i className='canvas__zoom-icon g3-icon g3-icon--plus' />
          </div>
          <div
            className='canvas__zoom-button canvas__zoom-button--zoom-out'
            onClick={this.handleZoomOut}
            onKeyPress={(e) => {
              if (e.charCode === 13 || e.charCode === 32) {
                e.preventDefault();
                this.handleZoomOut();
              }
            }}
            role='button'
            tabIndex={0}
            aria-label='Zoom out'
          >
            <i className='canvas__zoom-icon canvas__zoom-icon--zoom-in g3-icon g3-icon--minus' />
          </div>
        </div>
        <svg
          className='canvas__svg'
          ref={this.svgElement}
          width={this.state.canvasWidth}
          height={this.state.canvasHeight}
        >
          <rect
            className='canvas__overlay'
            width={this.state.canvasWidth}
            height={this.state.canvasHeight}
            onClick={this.handleClick}
          />
          <g className='canvas__container' ref={this.containerElement}>
            {Children.map(this.props.children, (child) =>
              cloneElement(child, {
                canvasWidth: this.state.canvasWidth,
                canvasHeight: this.state.canvasHeight,
              })
            )}
          </g>
        </svg>
      </div>
    );
  }
}

Canvas.propTypes = {
  minZoom: PropTypes.number,
  maxZoom: PropTypes.number,
  topLeftTranslateLimit: PropTypes.arrayOf(PropTypes.number),
  bottomRightTranslateLimit: PropTypes.arrayOf(PropTypes.number),
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
  onClickBlankSpace: PropTypes.func,
  onCanvasBoundingBoxUpdate: PropTypes.func,
  isGraphView: PropTypes.bool,
  needReset: PropTypes.bool,
  onResetCanvasFinished: PropTypes.func,
};

Canvas.defaultProps = {
  minZoom: 0.1,
  maxZoom: 10,
  topLeftTranslateLimit: [-Infinity, -Infinity],
  bottomRightTranslateLimit: [+Infinity, +Infinity],
  onClickBlankSpace: () => {},
  onCanvasBoundingBoxUpdate: () => {},
  isGraphView: true,
  needReset: false,
  onResetCanvasFinished: () => {},
};

export default Canvas;
