// jsdom does not support HTML5 canvas, so we need to mock out this function
HTMLCanvasElement.prototype.getContext = () => {
  return {
    scale: () => { },
    fillRect: () => { },
    strokeRect: () => { },
    fillText: () => { },
    beginPath: () => { },
    moveTo: () => { },
    lineTo: () => { },
    stroke: () => { },
  };
};

// Polyfill DragEvent
Object.defineProperty(window, 'DragEvent', {
  value: class DragEvent {}
});
