import { Component } from 'react';
import PropTypes from 'prop-types';
import {
  calculatePathRelatedToSecondHighlightingNode,
  calculateHighlightRelatedNodeIDs,
  calculateDataModelStructure,
} from './graphCalculatorHelper';

class GraphCalculator extends Component {
  constructor(props) {
    super(props);
    this.oldHighlightingNode = null;
    this.oldSecondHighlightingNodeID = null;
  }

  componentDidMount() {
    if (!this.props.layoutInitialized) this.props.initializeLayout();
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillUpdate(nextProps) {
    // if the highlighted node is updated, calculate related highlighted nodes
    const newHighlightingNode = nextProps.highlightingNode;
    const newSecondHighlightingNodeID = nextProps.secondHighlightingNodeID;
    if (this.oldHighlightingNode !== newHighlightingNode) {
      const relatedHighlightedNodeIDs = calculateHighlightRelatedNodeIDs(
        newHighlightingNode,
        this.props.nodes
      );
      this.props.onHighlightRelatedNodesCalculated(relatedHighlightedNodeIDs);
      const secondHighlightingNodeCandidateIDs = newHighlightingNode
        ? newHighlightingNode.outLinks
        : [];
      this.props.onSecondHighlightingNodeCandidateIDsCalculated(
        secondHighlightingNodeCandidateIDs
      );
    }

    // if the second highlighting node is updated, calculate related highlighting nodes
    if (this.oldSecondHighlightingNodeID !== newSecondHighlightingNodeID) {
      const pathRelatedToSecondHighlightingNode =
        calculatePathRelatedToSecondHighlightingNode(
          newHighlightingNode,
          newSecondHighlightingNodeID,
          this.props.nodes
        );
      this.props.onPathRelatedToSecondHighlightingNodeCalculated(
        pathRelatedToSecondHighlightingNode
      );
    }

    // update data model structure if update highlighting/secondHighlighting node
    if (
      this.oldHighlightingNode !== newHighlightingNode ||
      this.oldSecondHighlightingNodeID !== newSecondHighlightingNodeID
    ) {
      if (newSecondHighlightingNodeID) {
        const {
          dataModelStructure,
          dataModelStructureRelatedNodeIDs,
          routesBetweenStartEndNodes,
        } = this.getDataModelStructureForSecondHighlightingNodes(
          newHighlightingNode,
          newSecondHighlightingNodeID
        );
        this.props.onDataModelStructureCalculated(
          dataModelStructure,
          dataModelStructureRelatedNodeIDs,
          routesBetweenStartEndNodes
        );
      } else if (newHighlightingNode) {
        const {
          dataModelStructure,
          dataModelStructureRelatedNodeIDs,
          routesBetweenStartEndNodes,
        } = this.getDataModelStructureForHighlightedNodes(newHighlightingNode);
        this.props.onDataModelStructureCalculated(
          dataModelStructure,
          dataModelStructureRelatedNodeIDs,
          routesBetweenStartEndNodes
        );
      } else {
        this.props.onDataModelStructureCalculated(null);
      }
    }

    this.oldHighlightingNode = newHighlightingNode;
    this.oldSecondHighlightingNodeID = newSecondHighlightingNodeID;
  }

  getDataModelStructureForHighlightedNodes(newHighlightingNode) {
    const relatedHighlightedNodeIDs = calculateHighlightRelatedNodeIDs(
      newHighlightingNode,
      this.props.nodes
    );
    const subgraphEdges = this.props.edges
      .filter(
        (e) =>
          relatedHighlightedNodeIDs.includes(e.source) &&
          relatedHighlightedNodeIDs.includes(e.target)
      )
      .map((e) => ({ source: e.source, target: e.target }));
    const { dataModelStructure, routesBetweenStartEndNodes } =
      calculateDataModelStructure(
        newHighlightingNode,
        relatedHighlightedNodeIDs,
        subgraphEdges,
        this.props.nodes
      ) ?? {};
    return {
      dataModelStructure,
      dataModelStructureRelatedNodeIDs: relatedHighlightedNodeIDs,
      routesBetweenStartEndNodes,
    };
  }

  getDataModelStructureForSecondHighlightingNodes(
    newHighlightingNode,
    newSecondHighlightingNodeID
  ) {
    const subgraphNodeIDs = [];
    const pathRelatedToSecondHighlightingNode =
      calculatePathRelatedToSecondHighlightingNode(
        newHighlightingNode,
        newSecondHighlightingNodeID,
        this.props.nodes
      );
    pathRelatedToSecondHighlightingNode.forEach((e) => {
      if (!subgraphNodeIDs.includes(e.source)) subgraphNodeIDs.push(e.source);
      if (!subgraphNodeIDs.includes(e.target)) subgraphNodeIDs.push(e.target);
    });
    const { dataModelStructure, routesBetweenStartEndNodes } =
      calculateDataModelStructure(
        newHighlightingNode,
        subgraphNodeIDs,
        pathRelatedToSecondHighlightingNode,
        this.props.nodes
      ) ?? {};
    return {
      dataModelStructure,
      dataModelStructureRelatedNodeIDs: subgraphNodeIDs,
      routesBetweenStartEndNodes,
    };
  }

  render() {
    return null;
  }
}

GraphCalculator.propTypes = {
  initializeLayout: PropTypes.func,
  nodes: PropTypes.arrayOf(PropTypes.object),
  edges: PropTypes.arrayOf(PropTypes.object),
  highlightingNode: PropTypes.object,
  onHighlightRelatedNodesCalculated: PropTypes.func,
  onSecondHighlightingNodeCandidateIDsCalculated: PropTypes.func,
  secondHighlightingNodeID: PropTypes.string,
  onPathRelatedToSecondHighlightingNodeCalculated: PropTypes.func,
  onDataModelStructureCalculated: PropTypes.func,
  layoutInitialized: PropTypes.bool,
};

GraphCalculator.defaultProps = {
  initializeLayout: () => {},
  highlightingNode: null,
  nodes: [],
  edges: [],
  onHighlightRelatedNodesCalculated: () => {},
  secondHighlightingNodeID: null,
  onSecondHighlightingNodeCandidateIDsCalculated: () => {},
  onPathRelatedToSecondHighlightingNodeCalculated: () => {},
  onDataModelStructureCalculated: () => {},
  layoutInitialized: false,
};

export default GraphCalculator;
