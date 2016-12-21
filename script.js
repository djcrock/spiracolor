document.body.onload = init;

var COLOR_CHANGE_INTERVAL_MS = 1000;
var MAX_LINES = 500 * 4 * (7);

var vec2 = window.vec2;
var vec4 = window.vec4;
var canvas;
var boundingClientRect;
var gl;
var shaderProgram;
var dots = [];
var dotArrayBuffer;
var color = vec4.create();
var numDots = 4;
var dotSize = 5.0;
var mousePressed = false;
var touchIdentifier = null;
var mouseX = 0;
var mouseY = 0;
var oldMouseX = -1;
var oldMouseY = -1;
var target = vec2.create();
var resolutionMatrix = vec2.create();
var lines = [];
var vertices = new Float32Array(numDots * 4);

function init() {
  canvas = document.getElementById('swarm-canvas');
  gl = initWebGL(canvas);
  if (!gl) {
    return;
  }

  randomizeColor();

  canvas.addEventListener('mousedown', startClick);
  canvas.addEventListener('touchstart', startTouch);

  canvas.addEventListener('mouseup', endClick);
  canvas.addEventListener('touchend', endTouch);

  canvas.addEventListener('mousemove', moveMouse);
  canvas.addEventListener('touchmove', moveTouch);

  initShaders();
  initBuffers();

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  gl.lineWidth(dotSize);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  //gl.enable(gl.DEPTH_TEST);
  //gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT);

  bufferDots();
  requestAnimationFrame(tick);
  //canvas.addEventListener('mousemove', drawScene);
  //canvas.addEventListener('touchmove', drawScene);
}

function tick() {
  //gameTick();
  drawScene();
  requestAnimationFrame(tick);
}

function initWebGL(canvas) {
  var options = {
    alpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: true
  };
  gl = null;
  gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
  if (!gl) {
    alert('Your browser does not support WebGL :(');
  }
  return gl;
}

function initShaders() {
  var vertShader = getShader(gl, 'shader-vert');
  var fragShader = getShader(gl, 'shader-frag');
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertShader);
  gl.attachShader(shaderProgram, fragShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize shaders!');
  }
  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'a_Position');
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, 'a_Color');
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
}

function initBuffers() {
  dotArrayBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dotArrayBuffer);
}

function bufferDots() {
  vertices = Float32Array.from(lines);
  gl.bindBuffer(gl.ARRAY_BUFFER, dotArrayBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
}

function drawScene() {
  bufferDots();
  if(lines.length) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, dotArrayBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 3, gl.FLOAT, false, 20, 8);

    gl.drawArrays(gl.LINES, 0, lines.length / 5);
  }
}

function randomizeColor() {
  var r = Math.random() * .9 + .1;
  var g = Math.random() * .9 + .1;
  var b = Math.random() * .9 + .1;
  vec4.set(color, r, g, b, 1.0);
}

function addLines(startX, startY, endX, endY) {
  startX = startX / canvas.width;
  startY = startY / canvas.height;
  endX = endX / canvas.width;
  endY = endY / canvas.height;
  lines.push(startX, startY,
             color[0], color[1], color[2],
             endX, endY,
             color[0], color[1], color[2],
             1-startX, startY,
             color[0], color[1], color[2],
             1-endX, endY,
             color[0], color[1], color[2],
             1-startX, 1-startY,
             color[0], color[1], color[2],
             1-endX, 1-endY,
             color[0], color[1], color[2],
             startX, 1-startY,
             color[0], color[1], color[2],
             endX, 1-endY,
             color[0], color[1], color[2]
  );
  if(lines.length > MAX_LINES) {
    lines.splice(0, lines.length - MAX_LINES);
  }
}

function getShader(gl, scriptId) {
  var scriptElement = document.getElementById(scriptId);
  if (!scriptElement) {
    return null;
  }
  var script = '';
  var node = scriptElement.firstChild;
  while (node) {
    if (node.nodeType == Node.TEXT_NODE) {
      script += node.textContent;
    }
    node = node.nextSibling;
  }

  var shader;
  if (scriptElement.type === 'x-shader/x-fragment') {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (scriptElement.type === 'x-shader/x-vertex') {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, script);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

function resizeCanvas() {
  var width = canvas.clientWidth;
  var height = canvas.clientHeight;
  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  vec2.set(resolutionMatrix, canvas.width, canvas.height);
  boundingClientRect = canvas.getBoundingClientRect();
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function startClick(e) {
  e.preventDefault();
  mousePressed = true;
  mouseX = e.clientX;
  mouseY = e.clientY;
  randomizeColor();
}

function startTouch(e) {
  e.preventDefault();
  if (!touchIdentifier) {
    randomizeColor();
    touchIdentifier = e.touches[0].identifier;
    mousePressed = true;
    mouseX = e.touches[0].pageX;
    mouseY = e.touches[0].pageY;
  }
}

function moveMouse(e) {
  e.preventDefault();
  moveTarget(e.clientX, e.clientY);
}

function moveTouch(e) {
  e.preventDefault();
  moveTarget(e.touches[0].pageX, e.touches[0].pageY);
}

function endClick(e) {
  e.preventDefault();
  mousePressed = false;
  oldMouseX = -1;
  oldMouseY = -1;
}

function endTouch(e) {
  e.preventDefault();
  for (var i = 0, len = e.touches.length; i < len; i++) {
    if (e.touches[i].identifier === touchIdentifier) {
      // The original touch is still active.
      return;
    }
  }
  // The original touch was not found.
  mousePressed = false;
  touchIdentifier = null;
  oldMouseX = -1;
  oldMouseY = -1;
}

function moveTarget(x, y) {
  if(mousePressed) {
    oldMouseX = mouseX;
    oldMouseY = mouseY;
    mouseX = x;
    mouseY = y;
    addLines(oldMouseX, oldMouseY, mouseX, mouseY);
  }
}
