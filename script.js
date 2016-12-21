document.body.onload = init;

var COLOR_CHANGE_INTERVAL_MS = 500;

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
var vertices = new Float32Array(numDots * 4);

function init() {
  canvas = document.getElementById('swarm-canvas');
  gl = initWebGL(canvas);
  if (!gl) {
    return;
  }

  randomizeColor();
  setInterval(randomizeColor, COLOR_CHANGE_INTERVAL_MS);

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

  //requestAnimationFrame(tick);
  canvas.addEventListener('mousemove', drawScene);
  canvas.addEventListener('touchmove', drawScene);
}

function tick() {
  //gameTick();
  drawScene();
  requestAnimationFrame(tick);
}

function gameTick() {
  var targetX = mouseX - boundingClientRect.left;
  var targetY = canvas.height - (mouseY - boundingClientRect.top);
  vec2.set(target, targetX, targetY);
  for (var i = 0, len = dots.length; i < len; i++) {
    if (mousePressed) {
      dots[i].accelToward(target);
    }
    dots[i].moveTick();
  }
}

function initWebGL(canvas) {
  var options = {
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
  shaderProgram.resolutionUniform = gl.getUniformLocation(shaderProgram, 'u_Resolution');
  shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, 'u_Color');
}

function initBuffers() {
  dotArrayBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dotArrayBuffer);
  dotArrayBuffer.itemSize = 2;
  dotArrayBuffer.numItems = numDots * 2;
}

function bufferDots() {
  vertices[0] = oldMouseX;
  vertices[1] = oldMouseY;
  vertices[2] = mouseX;
  vertices[3] = mouseY;

  vertices[4] = canvas.width - oldMouseX;
  vertices[5] = oldMouseY;
  vertices[6] = canvas.width - mouseX;
  vertices[7] = mouseY;

  vertices[8] = canvas.width - oldMouseX;
  vertices[9] = canvas.height - oldMouseY;
  vertices[10] = canvas.width - mouseX;
  vertices[11] = canvas.height - mouseY;

  vertices[12] = oldMouseX;
  vertices[13] = canvas.height - oldMouseY;
  vertices[14] = mouseX;
  vertices[15] = canvas.height - mouseY;
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
}

function drawScene() {
  if(mousePressed && oldMouseX >= 0 && oldMouseY >= 0) {
    bufferDots();

    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform4fv(shaderProgram.colorUniform, color);

    gl.bindBuffer(gl.ARRAY_BUFFER, dotArrayBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, dotArrayBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.LINES, 0, dotArrayBuffer.numItems);
  }
}

function randomizeColor() {
  var r = Math.random() * .9 + .1;
  var g = Math.random() * .9 + .1;
  var b = Math.random() * .9 + .1;
  vec4.set(color, r, g, b, 1.0);
};

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
  gl.uniform2fv(shaderProgram.resolutionUniform, resolutionMatrix);
  boundingClientRect = canvas.getBoundingClientRect();
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function startClick(e) {
  e.preventDefault();
  mousePressed = true;
  moveTarget(e.clientX, e.clientY);
}

function startTouch(e) {
  e.preventDefault();
  if (!touchIdentifier) {
    touchIdentifier = e.touches[0].identifier;
    mousePressed = true;
    moveTarget(e.touches[0].pageX, e.touches[0].pageY);
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
  oldMouseX = mouseX;
  oldMouseY = mouseY;
  mouseX = x;
  mouseY = y;
}
