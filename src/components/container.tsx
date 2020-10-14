import React, { FC } from 'react';
import { useDrop, DropTargetMonitor } from 'react-dnd';
const Container: FC = ({ children }) => {
  const [{ canDrop, isOver }, dropRef] = useDrop({
    accept: 'DragItem',
    drop: (item, monitor) => ({ item, position: monitor.getSourceClientOffset() }),
    collect: (monitor: DropTargetMonitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div className='drop-container' ref={dropRef}>
      {children}
    </div>
  );
};

export default Container;
