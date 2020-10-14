import { Button, Card, Col, Form, Input, message, Row, Typography } from "antd";
import React, { Component } from "react";
import G6, { Graph } from "@antv/g6";
import "./index.less";
import {
  concat,
  filter,
  find,
  get,
  indexOf,
  isEmpty,
  keyBy,
  keys,
  map,
  startsWith,
  omit,
} from "lodash";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DropContainer from "./components/container";
import DragItem from "./components/drag-item";
import { getNodeStyle } from "./util";
import { NODE_HEIGHT, NODE_WIDTH, LABEL_ENUM } from "./config/constants";
import { IEdge } from "@antv/g6/lib/interface/item";
import { createWorkflows, getWorkflowsById, updateWorkflows } from "./methods";
import { toApi, fromApi } from "./config/adapter";

interface IProps {}
interface IState {
  currentEditor: { id: string; node: any; label: string } | {};
  workflowData: any;
  customData: any;
}

export default class WorkFlow extends Component<IProps, IState> {
  editorRef: any;
  minimapRef: any;
  id: any = 1;
  graphEditor: any;

  state = {
    currentEditor: {},
    workflowData: {},
    customData: "",
  };
  formRef: any;

  async componentDidMount() {
    const _that = this;
    const workflowData = fromApi(await getWorkflowsById(1));
    this.setState({
      workflowData,
      customData: JSON.stringify({ ...omit(workflowData, "jsontext") }),
    });
    G6.registerBehavior("drag-to-container", {
      getEvents() {
        return {
          click: "onMouseClick",
          mousedown: "onMouseDown",
          mousemove: "onMouseMove",
          mouseup: "onMouseUp",
          "node:click": "onNodeClick",
          "edge:click": "onEdgeClick",
        };
      },
      onMouseClick(ev: any) {
        ev.preventDefault();
        const self = this;
        const graph = self.graph as Graph;
        // 将当前是click的都设为false
        const clickNodes = graph.findAllByState("node", "click");
        clickNodes.forEach((cn) => {
          graph.setItemState(cn, "click", false);
        });
        // 将当前是click的都设为false
        const clickEdgees = graph.findAllByState("edge", "click");
        clickEdgees.forEach((cn) => {
          graph.setItemState(cn, "click", false);
        });
        if (!ev.item) {
          _that.setState({
            currentEditor: {
              id: "",
              node: null,
              label: "",
            },
          });
        }
      },
      onMouseDown(ev: any) {
        ev.preventDefault();
        const self = this;
        const node = ev.item;
        if (node && ev.target.get("className").startsWith("link-point")) {
          const graph = self.graph as Graph;
          const model = node.getModel();
          if (!self.addingEdge && !self.edge) {
            self.edge = graph.addItem("edge", {
              source: model.id,
              target: model.id,
              id: `edge-${Math.random()}`,
            });
            self.addingEdge = true;
          }
          _that.refreshGraphState();
        }
      },
      onMouseMove(ev: any) {
        ev.preventDefault();
        const self = this;
        const point = { x: ev.x, y: ev.y };
        if (self.addingEdge && self.edge) {
          (self.graph as Graph).updateItem(self.edge as IEdge, {
            target: point,
          });
        }
      },
      onMouseUp(ev: any) {
        ev.preventDefault();
        const self = this;
        const node = ev.item;
        const graph = self.graph as Graph;
        if (node && !node.destroyed && node.getType() === "node") {
          const model = node.getModel();
          if (self.addingEdge && self.edge) {
            graph.updateItem(self.edge as IEdge, {
              target: model.id,
            });
            self.edge = null;
            self.addingEdge = false;
            _that.refreshGraphState();
          }
        } else {
          if (self.addingEdge && self.edge) {
            graph.removeItem(self.edge as IEdge);
            self.edge = null;
            self.addingEdge = false;
            _that.refreshGraphState();
          }
        }
      },
      onNodeClick(ev: any) {
        ev.preventDefault();
        const self = this;
        const graph = self.graph as Graph;
        const item = ev.item;
        if (item) {
          // 将当前是click的都设为false
          const clickNodes = graph.findAllByState("node", "click");
          clickNodes.forEach((cn) => {
            graph.setItemState(cn, "click", false);
          });
          // 将当前是click的都设为false
          const clickEdgees = graph.findAllByState("edge", "click");
          clickEdgees.forEach((cn) => {
            graph.setItemState(cn, "click", false);
          });
          // 将当前node设为click
          graph.setItemState(item, "click", true);
          const model = item.getModel();

          // 显示右侧表单数据
          const { workflowData } = _that.state;
          const propsData = get(
            find(
              get(workflowData, "graphData.nodes"),
              (node) => node.id === model.id
            ),
            "data"
          );
          _that.formRef.setFieldsValue({
            label: model.label,
            data: propsData,
          });

          _that.setState({
            currentEditor: {
              id: model.id,
              node: item,
              label: model.label || "",
            },
          });
        }
      },
      onEdgeClick(ev: any) {
        ev.preventDefault();
        const self = this;
        const graph = self.graph as Graph;
        const item = ev.item;
        // 将当前是click的都设为false
        const clickNodes = graph.findAllByState("node", "click");
        clickNodes.forEach((cn) => {
          graph.setItemState(cn, "click", false);
        });
        const clickEdgees = graph.findAllByState("edge", "click");
        clickEdgees.forEach((cn) => {
          graph.setItemState(cn, "click", false);
        });
        // 将当前node设为click
        graph.setItemState(item, "click", true);
        const model = item.getModel();

        // 显示右侧表单数据
        const { workflowData } = _that.state;
        const propsData = get(
          find(
            get(workflowData, "graphData.edges"),
            (edge) => edge.id === model.id
          ),
          "data"
        );
        _that.formRef.setFieldsValue({
          label: model.label,
          data: propsData,
        });

        _that.setState({
          currentEditor: { id: model.id, node: item, label: model.label || "" },
        });
      },
    });
    const toolbar = new G6.ToolBar();
    const contextMenu = new G6.Menu({
      getContent(graph: any) {
        return `<span>删除</span>`;
      },
      handleMenuClick(target: any, item: any) {
        const id = item.getID();
        const type = item.getType();
        if (type === "edge") {
          // 删除图的边
          _that.graphEditor?.removeItem(item as IEdge);
        } else if (type === "node") {
          // 删除图的节点
          let edges: IEdge[] = [];
          _that.graphEditor?.getEdges().forEach((item) => {
            if (
              item.getTarget().getID() === id ||
              item.getSource().getID() === id
            ) {
              edges.push(item);
            }
          });
          edges.forEach((edge) => {
            _that.graphEditor?.removeItem(edge);
          });
          _that.graphEditor?.removeItem(item as IEdge);
        }
        _that.refreshGraphState();
      },
      offsetX: 20,
      offsetY: 30,
      itemTypes: ["node", "edge"],
    });
    const minimap = new G6.Minimap({
      container: this.minimapRef,
      size: [214, 150],
      className: "minimap",
      type: "delegate",
    });
    const grid = new G6.Grid();
    this.graphEditor = new G6.Graph({
      container: this.editorRef,
      width: this.editorRef.scrollWidth || 1000,
      height: this.editorRef.scrollHeight || 800,
      plugins: [grid, minimap, contextMenu, toolbar],
      layout: {
        type: "dagre",
        rankdir: "TB",
        ranksep: 30,
      },
      modes: {
        default: [
          "drag-canvas",
          "zoom-canvas",
          "drag-node",
          "drag-to-container",
        ],
      },
      defaultNode: {
        style: {
          fill: "#FFF",
        },
        linkPoints: {
          top: true,
          right: true,
          bottom: true,
          left: true,
          size: 8,
          fill: "#fff",
        },
      },
      nodeStateStyles: {
        click: {
          fill: "#C6E5FF",
        },
      },
      defaultEdge: {
        type: "line",
        style: {
          stroke: "#F6BD16",
          lineAppendWidth: 10,
          endArrow: true,
          lineWidth: 2,
        },
      },
      edgeStateStyles: {
        click: {
          lineWidth: 4,
        },
      },
    });
    !isEmpty(get(workflowData, "graphData")) &&
      this.graphEditor.data(get(workflowData, "graphData"));
    this.graphEditor.render();
  }

  handleDragEnd = (
    item: { name: string },
    position: { x: number; y: number }
  ) => {
    if (position && position.x > 160 && position.y > 50) {
      // 完全进入画布，则生成一个节点
      let key = `id-${Math.random()}`;
      const style = getNodeStyle(item.name);
      const newNode = {
        ...style,
        id: key,
        x: position.x - (160 - NODE_WIDTH / 2),
        y: position.y - (50 - NODE_HEIGHT / 2),
        anchorPoints: [
          [0.5, 0],
          [1, 0.5],
          [0.5, 1],
          [0, 0.5],
        ],
        label: LABEL_ENUM[item.name],
      };
      this.graphEditor?.addItem("node", newNode);
      this.refreshGraphState();
    }
  };

  // 同步节点信息到 state 中
  refreshGraphState = () => {
    const { workflowData } = this.state;
    const { nodes, edges } = this.graphEditor.save();
    const edgeKeys = keys(keyBy(edges, "id"));
    const nodekeys = keys(keyBy(nodes, "id"));
    let newNodes = get(workflowData, "graphData.nodes") || [];
    let newEdges = get(workflowData, "graphData.edges") || [];

    // 过滤不在图里面，却在 state 里面的节点数据
    newNodes = filter(newNodes, (node) => indexOf(nodekeys, node.id) > -1);
    newEdges = filter(newEdges, (edge) => indexOf(edgeKeys, edge.id) > -1);

    // 添加在图里面，却不在 state 里面的节点数据
    const newEdgeKeys = keys(keyBy(newEdges, "id"));
    const newNodekeys = keys(keyBy(newNodes, "id"));
    const tempNodes = filter(
      nodes,
      (node) => indexOf(newNodekeys, node.id) === -1
    );
    const tempEdges = filter(
      edges,
      (edge) => indexOf(newEdgeKeys, edge.id) === -1
    );

    this.setState({
      workflowData: {
        ...workflowData,
        graphData: {
          nodes: concat(newNodes, tempNodes),
          edges: concat(newEdges, tempEdges),
        },
      },
    });
  };

  // 更新表单数据到图
  handleRefreshGraph = (value: any) => {
    const { currentEditor, workflowData } = this.state;
    this.graphEditor?.updateItem(currentEditor.node, { label: value.label });
    const oldNodes = get(workflowData, "graphData.nodes");
    const oldEdges = get(workflowData, "graphData.edges");
    let { nodes, edges } = this.graphEditor.save();
    if (startsWith(currentEditor.node._cfg.id, "edge")) {
      edges = map(edges, (edge, index) => {
        if (edge.id == currentEditor.node._cfg.id) {
          return {
            ...edge,
            data: value.data,
          };
        }
        return {
          ...edge,
          data: get(oldEdges, `${index}.data`),
        };
      });
    }
    if (startsWith(currentEditor.node._cfg.id, "id")) {
      nodes = map(nodes, (node, index) => {
        if (node.id == currentEditor.node._cfg.id) {
          return {
            ...node,
            data: value.data,
          };
        }
        return {
          ...node,
          data: get(oldNodes, `${index}.data`),
        };
      });
    }
    this.setState({
      workflowData: {
        ...workflowData,
        graphData: { nodes, edges },
      },
    });
  };

  handleInit = async () => {
    const workflowData = fromApi(await getWorkflowsById(1));
    !isEmpty(get(workflowData, "graphData")) &&
      this.graphEditor.data(get(workflowData, "graphData"));
    this.graphEditor.render();
    this.setState({
      workflowData,
      customData: JSON.stringify({ ...omit(workflowData, "jsontext") }),
    });
  };

  transforDataToGraph = async () => {
    const { customData } = this.state;
    const workflowData = JSON.parse(customData);
    !isEmpty(get(workflowData, "graphData")) &&
      this.graphEditor.data(get(workflowData, "graphData"));
    this.graphEditor.render();
    message.success("操作成功");
    this.setState({
      workflowData,
    });
  };

  transforGraphToData = async () => {
    const { workflowData } = this.state;
    message.success("操作成功");
    console.log(workflowData);
    this.setState({
      customData: JSON.stringify({ ...omit(workflowData, "jsontext") }),
    });
  };

  handleCustomChange = (data) => {
    this.setState({
      customData: data.target.value,
    });
  };

  render() {
    const { currentEditor, customData } = this.state;

    return (
      <DndProvider backend={HTML5Backend}>
        <div className="workflow">
          <div className="workflow-items">
            <DragItem name="rect" onDragEnd={this.handleDragEnd}>
              <div className="workflow-items-node workflow-items-node-rectangle"></div>
            </DragItem>
            <DragItem name="circle" onDragEnd={this.handleDragEnd}>
              <div className="workflow-items-node workflow-items-node-circular"></div>
            </DragItem>
            <DragItem name="diamond" onDragEnd={this.handleDragEnd}>
              <div className="workflow-items-node workflow-items-node-diamond"></div>
            </DragItem>
          </div>
          <div className="workflow-editor">
            <DropContainer>
              <div
                ref={(refNode) => {
                  this.editorRef = refNode;
                }}
              ></div>
            </DropContainer>
          </div>
          <div className="workflow-props">
            <Typography.Title className="workflow-props-title" level={5}>
              缩略图
            </Typography.Title>
            <div
              ref={(refNode) => {
                this.minimapRef = refNode;
              }}
              className="minimap-container"
            ></div>
            <Typography.Title className="workflow-props-title" level={5}>
              操作
            </Typography.Title>
            <Form
              ref={(refNode) => {
                this.formRef = refNode;
              }}
              size="small"
              className="workflow-props-edit"
              onFinish={this.handleRefreshGraph}
            >
              {!isEmpty(currentEditor) && currentEditor.id ? (
                <>
                  <Form.Item name="label" label="标签">
                    <Input placeholder="请输入标签" />
                  </Form.Item>
                  <Form.Item name="data" label="属性">
                    <Input.TextArea placeholder="请输入属性" cols={20} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit">
                      更新
                    </Button>
                  </Form.Item>
                </>
              ) : null}
            </Form>
          </div>
        </div>
        <div className="actions">
          <Row>
            <Col span={6}>
              <Card title="操作">
                <Button
                  className="actions-btn"
                  type="primary"
                  onClick={this.handleInit}
                >
                  获取初始化图
                </Button>
                <Button
                  className="actions-btn"
                  type="primary"
                  onClick={this.transforGraphToData}
                >
                  图转换为数据
                </Button>
                <Button
                  className="actions-btn"
                  type="primary"
                  onClick={this.transforDataToGraph}
                >
                  数据转换为图
                </Button>
              </Card>
            </Col>
            <Col span={18}>
              <Card title="数据">
                <Input.TextArea
                  rows={5}
                  onChange={this.handleCustomChange}
                  value={customData}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </DndProvider>
    );
  }
}
