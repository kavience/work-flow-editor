import { NODE_WIDTH } from './config/constants';

export const getNodeStyle = (name: string) => {
  if (name === 'circle') {
    return {
      type: 'circle',
      size: NODE_WIDTH,
      style: {
        stroke: '#1890ff',
        fill: '#FFF',
      },
    };
  } else if (name === 'rect') {
    return {
      type: 'rect',
      size: [NODE_WIDTH, NODE_WIDTH / 2],
      style: {
        fill: '#FFF',
        stroke: '#1890ff',
      },
    };
  } else if (name === 'diamond') {
    return {
      type: 'diamond',
      size: NODE_WIDTH,
      style: {
        fill: '#FFF',
        stroke: '#1890ff',
      },
    };
  }

  return;
};
