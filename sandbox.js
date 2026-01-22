const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

let objects = [];
let selectedTool = 'none';
let selectedObject = null;
let isRunning = false;
let animationId = null;
let objectIdCounter = 0;
let lastTime = 0;
let isPresetDropdownOpen = false;
let openAttachDropdownId = null;

let isDragging = false;
let dragObject = null;
let dragOffsetX = 0, dragOffsetY = 0;

let settings = {
    gravity: 9.8,
    airRes: 0.1,
    showVectors: true,
    showGrid: true,
    showTrails: false,
    collision: true
};

const objectTemplates = {
    ball: {
        type: 'ball',
        mass: 1,
        radius: 20,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: '#667eea',
        restitution: 0.8,
        trail: []
    },
    spring: {
        type: 'spring',
        k: 50,
        length: 100,
        x: 0,
        y: 0,
        attachedTo: null,
        color: '#4facfe'
    },
    pendulum: {
        type: 'pendulum',
        length: 150,
        angle: 0.5,
        angularVel: 0,
        mass: 1,
        x: 0,
        y: 0,
        color: '#43e97b',
        attachedTo: null,
        restitution: 0.3
    },
    wall: {
        type: 'wall',
        x: 0,
        y: 0,
        width: 200,
        height: 20,
        rotation: 0,
        color: '#fa709a'
    }
};

function selectTool(tool) {
    selectedTool = tool;
    document.querySelectorAll('.object-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    if (event && event.target) {
        const btn = event.target.closest('.object-btn');
        if (btn) btn.classList.add('selected');
    }
}

canvas.addEventListener('click', (e) => {
    if (selectedTool !== 'none' && !isRunning && !isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newObj = JSON.parse(JSON.stringify(objectTemplates[selectedTool]));
        newObj.x = x;
        newObj.y = y;
        newObj.id = objectIdCounter++;
        newObj.name = `${selectedTool}_${newObj.id}`;
        
        if (newObj.type === 'ball') {
            newObj.trail = [];
        }
        
        objects.push(newObj);
        updateObjectList();
        drawScene();
    }
});

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (e.button === 0 && !isRunning) {
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            
            if (obj.type === 'ball') {
                const dx = x - obj.x;
                const dy = y - obj.y;
                if (dx*dx + dy*dy < obj.radius*obj.radius) {
                    isDragging = true;
                    dragObject = obj;
                    dragOffsetX = dx;
                    dragOffsetY = dy;
                    selectObject(obj);
                    e.preventDefault();
                    return;
                }
            }
        }
        
        if (selectedTool === 'none' && selectedObject) {
            selectedObject = null;
            document.getElementById('propertiesContent').innerHTML = '<div class="no-selection">Select an object to edit its properties</div>';
            updateObjectList();
            drawScene();
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && dragObject) {
        const rect = canvas.getBoundingClientRect();
        dragObject.x = e.clientX - rect.left - dragOffsetX;
        dragObject.y = e.clientY - rect.top - dragOffsetY;
        
        if (dragObject.trail) {
            dragObject.trail.push({x: dragObject.x, y: dragObject.y});
            if (dragObject.trail.length > 50) dragObject.trail.shift();
        }
        
        drawScene();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        dragObject = null;
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        
        if (obj.type === 'ball') {
            const dx = x - obj.x;
            const dy = y - obj.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < (obj.radius || 30)) {
                selectObject(obj);
                return;
            }
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey && !e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'escape':
            case 'n':
                selectTool('none');
                break;
            case 'b': 
                selectTool('ball');
                break;
            case 'p': 
                selectTool('pendulum');
                break;
            case 's': 
                selectTool('spring');
                break;
            case 'w': 
                selectTool('wall');
                break;
            case ' ': 
                toggleSimulation();
                e.preventDefault();
                break;
            case 'delete': 
                if (selectedObject) {
                    deleteObject(selectedObject.id);
                }
                break;
            case 'g': toggleGrid(); break;
            case 'v': toggleVectors(); break;
            case 't': toggleTrails(); break;
        }
    }
});

function updateObjectList() {
    const list = document.getElementById('objectList');
    if (objects.length === 0) {
        list.innerHTML = '<div class="no-selection">No objects yet. Click an object type and then click on the canvas to add it.</div>';
        return;
    }

    list.innerHTML = objects.map(obj => `
        <div class="object-item ${selectedObject === obj ? 'selected' : ''}" onclick="selectObjectById(${obj.id})">
            <span>${obj.name}</span>
            <button class="delete-btn" onclick="deleteObject(${obj.id}); event.stopPropagation();">Delete</button>
        </div>
    `).join('');
}

function selectObject(obj) {
    selectedObject = obj;
    updateObjectList();
    showProperties(obj);
    drawScene();
}

function selectObjectById(id) {
    const obj = objects.find(o => o.id === id);
    if (obj) selectObject(obj);
}

function deleteObject(id) {
    objects = objects.filter(o => o.id !== id);
    objects.forEach(o => {
        if (o.attachedTo === id) o.attachedTo = null;
    });
    if (selectedObject && selectedObject.id === id) {
        selectedObject = null;
        document.getElementById('propertiesContent').innerHTML = '<div class="no-selection">Select an object to edit its properties</div>';
    }
    updateObjectList();
    drawScene();
}

function showProperties(obj) {
    const content = document.getElementById('propertiesContent');
    let html = '';

    if (obj.type === 'ball') {
        html = `
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Mass (kg)</span></div>
                <input type="number" value="${obj.mass}" step="0.1" onchange="updateObjProp(${obj.id}, 'mass', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Radius (px)</span></div>
                <input type="number" value="${obj.radius}" onchange="updateObjProp(${obj.id}, 'radius', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Velocity X (m/s)</span></div>
                <input type="number" value="${obj.vx.toFixed(2)}" step="0.5" onchange="updateObjProp(${obj.id}, 'vx', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Velocity Y (m/s)</span></div>
                <input type="number" value="${obj.vy.toFixed(2)}" step="0.5" onchange="updateObjProp(${obj.id}, 'vy', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Restitution</span></div>
                <input type="number" value="${obj.restitution}" step="0.1" min="0" max="1" onchange="updateObjProp(${obj.id}, 'restitution', this.value)">
            </div>
        `;
    } else if (obj.type === 'pendulum') {
        html = `
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Length (px)</span></div>
                <input type="number" value="${obj.length}" onchange="updateObjProp(${obj.id}, 'length', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Mass (kg)</span></div>
                <input type="number" value="${obj.mass}" step="0.1" onchange="updateObjProp(${obj.id}, 'mass', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Initial Angle (rad)</span></div>
                <input type="number" value="${obj.angle.toFixed(2)}" step="0.1" onchange="updateObjProp(${obj.id}, 'angle', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Bounce Factor</span></div>
                <input type="number" value="${obj.restitution}" step="0.1" min="0" max="1" onchange="updateObjProp(${obj.id}, 'restitution', this.value)">
            </div>
        `;
    } else if (obj.type === 'spring') {
        const attachableObjects = objects.filter(o => o.type === 'ball' && o.id !== obj.id);
        html = `
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Spring Constant (N/m)</span></div>
                <input type="number" value="${obj.k}" onchange="updateObjProp(${obj.id}, 'k', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Rest Length (px)</span></div>
                <input type="number" value="${obj.length}" onchange="updateObjProp(${obj.id}, 'length', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Attach to Ball</span></div>
                <div class="dropdown1 small" id="attachDropdown_${obj.id}">
                    <div class="dropdown-header" onclick="toggleAttachDropdown(${obj.id})">
                        <span id="selectedAttach_${obj.id}">${obj.attachedTo ? objects.find(o => o.id === obj.attachedTo)?.name || 'Select ball...' : 'None'}</span>
                        <span class="dropdown-arrow">▼</span>
                    </div>
                    <div class="dropdown-list" id="attachList_${obj.id}">
                        <div class="dropdown-item" onclick="selectAttachBall(${obj.id}, null, 'None')">None</div>
                        ${attachableObjects.map(o => `
                            <div class="dropdown-item" onclick="selectAttachBall(${obj.id}, ${o.id}, '${o.name}')">${o.name}</div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } else if (obj.type === 'wall') {
        html = `
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Width (px)</span></div>
                <input type="number" value="${obj.width}" onchange="updateObjProp(${obj.id}, 'width', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label"><span>Height (px)</span></div>
                <input type="number" value="${obj.height}" onchange="updateObjProp(${obj.id}, 'height', this.value)">
            </div>
            <div class="sim-control-group">
                <div class="sim-control-label">
                    <span>Rotation (degrees)</span>
                    <span class="sim-control-value">${Math.round(obj.rotation * 180 / Math.PI)}°</span>
                </div>
                <input type="range" min="0" max="${Math.PI * 2}" step="0.01" value="${obj.rotation}" oninput="updateObjProp(${obj.id}, 'rotation', this.value); document.querySelector('.sim-control-value').textContent = Math.round(this.value * 180 / Math.PI) + '°'">
            </div>
        `;
    }

    content.innerHTML = html;
}

function updateObjProp(id, prop, value) {
    const obj = objects.find(o => o.id === id);
    if (obj) {
        if (value === null || value === 'null') {
            obj[prop] = null;
        } else {
            obj[prop] = parseFloat(value);
        }
        drawScene();
    }
}

function updateGlobalParam(param, value) {
    settings[param] = parseFloat(value);
    document.getElementById(`val-${param}`).textContent = value;
}

function toggleVectors() {
    settings.showVectors = !settings.showVectors;
    document.getElementById('toggle-vectors').classList.toggle('active');
    drawScene();
}

function toggleGrid() {
    settings.showGrid = !settings.showGrid;
    document.getElementById('toggle-grid').classList.toggle('active');
    drawScene();
}

function toggleTrails() {
    settings.showTrails = !settings.showTrails;
    document.getElementById('toggle-trails').classList.toggle('active');
    drawScene();
}

function toggleCollision() {
    settings.collision = !settings.collision;
    document.getElementById('toggle-collision').classList.toggle('active');
}

function toggleSimulation() {
    isRunning = !isRunning;
    document.getElementById('playPauseText').textContent = isRunning ? 'Pause' : 'Start';
    if (isRunning) {
        lastTime = performance.now();
        animate();
    } else {
        cancelAnimationFrame(animationId);
    }
}

function clearCanvas() {
    if (confirm('Are you sure you want to clear all objects?')) {
        objects = [];
        selectedObject = null;
        objectIdCounter = 0;
        if (isRunning) {
            toggleSimulation();
        }
        updateObjectList();
        document.getElementById('propertiesContent').innerHTML = '<div class="no-selection">Select an object to edit its properties</div>';
        drawScene();
    }
}

function getPendulumBobPosition(pendulum) {
    let bobX, bobY;
    
    if (pendulum.attachedTo !== null) {
        const attachedBall = objects.find(o => o.id === pendulum.attachedTo);
        if (attachedBall && attachedBall.type === 'ball') {
            bobX = attachedBall.x;
            bobY = attachedBall.y;
            
            const dx = bobX - pendulum.x;
            const dy = bobY - pendulum.y;
            pendulum.length = Math.sqrt(dx*dx + dy*dy);
            pendulum.angle = Math.atan2(dx, dy);
        } else {
            pendulum.attachedTo = null;
            bobX = pendulum.x + Math.sin(pendulum.angle) * pendulum.length;
            bobY = pendulum.y + Math.cos(pendulum.angle) * pendulum.length;
        }
    } else {
        bobX = pendulum.x + Math.sin(pendulum.angle) * pendulum.length;
        bobY = pendulum.y + Math.cos(pendulum.angle) * pendulum.length;
    }
    
    return { x: bobX, y: bobY };
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (settings.showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    objects.forEach(obj => {
        ctx.save();
        
        if (obj.type === 'ball') {
            if (settings.showTrails && obj.trail && obj.trail.length > 1) {
                ctx.strokeStyle = obj.color + '80';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(obj.trail[0].x, obj.trail[0].y);
                for (let i = 1; i < obj.trail.length; i++) {
                    ctx.lineTo(obj.trail[i].x, obj.trail[i].y);
                }
                ctx.stroke();
            }
            
            ctx.fillStyle = obj === selectedObject ? '#fff' : obj.color;
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fill();
            
            if (obj === selectedObject) {
                ctx.strokeStyle = '#ff9900';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.radius + 2, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            if (settings.showVectors && (obj.vx !== 0 || obj.vy !== 0)) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(obj.x, obj.y);
                ctx.lineTo(obj.x + obj.vx * 10, obj.y + obj.vy * 10);
                ctx.stroke();
            }
            
        } else if (obj.type === 'pendulum') {
            const bobPos = getPendulumBobPosition(obj);
            
            ctx.strokeStyle = obj.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y);
            ctx.lineTo(bobPos.x, bobPos.y);
            ctx.stroke();
            
            ctx.fillStyle = obj.color;
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = obj.color;
            ctx.beginPath();
            ctx.arc(bobPos.x, bobPos.y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            if (obj === selectedObject) {
                ctx.strokeStyle = '#ff9900';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(bobPos.x, bobPos.y, 17, 0, Math.PI * 2);
                ctx.stroke();
            }
            
        } else if (obj.type === 'spring') {
            let endX, endY;
            
            if (obj.attachedTo !== null) {
                const attachedBall = objects.find(o => o.id === obj.attachedTo);
                if (attachedBall && attachedBall.type === 'ball') {
                    endX = attachedBall.x;
                    endY = attachedBall.y;
                } else {
                    obj.attachedTo = null;
                    endX = obj.x;
                    endY = obj.y + obj.length;
                }
            } else {
                endX = obj.x;
                endY = obj.y + obj.length;
            }
            
            if (endX !== undefined && endY !== undefined) {
                ctx.strokeStyle = obj.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obj.x, obj.y);
                
                const dx = endX - obj.x;
                const dy = endY - obj.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const coils = 10;
                const coilWidth = 20;
                
                for (let i = 0; i <= coils; i++) {
                    const t = i / coils;
                    const x = obj.x + dx * t + (i % 2 === 0 ? -coilWidth : coilWidth) * (dy / dist);
                    const y = obj.y + dy * t - (i % 2 === 0 ? -coilWidth : coilWidth) * (dx / dist);
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
                
                if (obj === selectedObject) {
                    ctx.fillStyle = '#ff9900';
                    ctx.beginPath();
                    ctx.arc(obj.x, obj.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
        } else if (obj.type === 'wall') {
            ctx.translate(obj.x, obj.y);
            ctx.rotate(obj.rotation);
            ctx.fillStyle = obj.color;
            ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
            
            if (obj === selectedObject) {
                ctx.strokeStyle = '#ff9900';
                ctx.lineWidth = 3;
                ctx.strokeRect(-obj.width/2 - 2, -obj.height/2 - 2, obj.width + 4, obj.height + 4);
            }
        }
        
        ctx.restore();
    });
}

function updatePhysics(dt) {
    dt = Math.min(dt, 0.033);
    
    objects.forEach(obj => {
        if (obj.type === 'ball') {
            obj.vy += settings.gravity * dt * 10;
            
            obj.vx *= (1 - settings.airRes * dt);
            obj.vy *= (1 - settings.airRes * dt);
            
            obj.x += obj.vx * dt * 10;
            obj.y += obj.vy * dt * 10;
            
            if (obj.trail) {
                obj.trail.push({x: obj.x, y: obj.y});
                if (obj.trail.length > 50) obj.trail.shift();
            }

            if (obj.x - obj.radius < 0) {
                obj.x = obj.radius;
                obj.vx = -obj.vx * obj.restitution;
            }
            if (obj.x + obj.radius > canvas.width) {
                obj.x = canvas.width - obj.radius;
                obj.vx = -obj.vx * obj.restitution;
            }
            if (obj.y - obj.radius < 0) {
                obj.y = obj.radius;
                obj.vy = -obj.vy * obj.restitution;
            }
            if (obj.y + obj.radius > canvas.height) {
                obj.y = canvas.height - obj.radius;
                obj.vy = -obj.vy * obj.restitution;
            }
            
        } else if (obj.type === 'pendulum' && obj.attachedTo === null) {
            const g = settings.gravity;
            const L = Math.max(obj.length / 50, 0.1);
            const angularAcc = -(g / L) * Math.sin(obj.angle);
            
            const damping = 1 - settings.airRes * dt * 0.5;
            
            obj.angularVel += angularAcc * dt;
            obj.angularVel *= damping;
            obj.angle += obj.angularVel * dt;
        }
    });

    if (settings.collision) {
        const balls = objects.filter(o => o.type === 'ball');
        const walls = objects.filter(o => o.type === 'wall');
        const pendulums = objects.filter(o => o.type === 'pendulum');
        
        walls.forEach(wall => {
            balls.forEach(ball => {
                const cos = Math.cos(wall.rotation);
                const sin = Math.sin(wall.rotation);
                
                const localX = (ball.x - wall.x) * cos + (ball.y - wall.y) * sin;
                const localY = -(ball.x - wall.x) * sin + (ball.y - wall.y) * cos;
                
                const halfW = wall.width / 2;
                const halfH = wall.height / 2;
                
                const closestX = Math.max(-halfW, Math.min(halfW, localX));
                const closestY = Math.max(-halfH, Math.min(halfH, localY));
                
                const dx = localX - closestX;
                const dy = localY - closestY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < ball.radius) {
                    const worldClosestX = wall.x + closestX * cos - closestY * sin;
                    const worldClosestY = wall.y + closestX * sin + closestY * cos;
                    
                    const normalX = (ball.x - worldClosestX) / dist;
                    const normalY = (ball.y - worldClosestY) / dist;
                    
                    const overlap = ball.radius - dist;
                    ball.x += normalX * overlap;
                    ball.y += normalY * overlap;
                    
                    const dotProduct = ball.vx * normalX + ball.vy * normalY;
                    ball.vx -= 2 * dotProduct * normalX * ball.restitution;
                    ball.vy -= 2 * dotProduct * normalY * ball.restitution;
                }
            });
            
            pendulums.forEach(pendulum => {
                const bobPos = getPendulumBobPosition(pendulum);
                const bobRadius = 15;
                
                const cos = Math.cos(wall.rotation);
                const sin = Math.sin(wall.rotation);
                
                const localX = (bobPos.x - wall.x) * cos + (bobPos.y - wall.y) * sin;
                const localY = -(bobPos.x - wall.x) * sin + (bobPos.y - wall.y) * cos;
                
                const halfW = wall.width / 2;
                const halfH = wall.height / 2;
                
                const closestX = Math.max(-halfW, Math.min(halfW, localX));
                const closestY = Math.max(-halfH, Math.min(halfH, localY));
                
                const dx = localX - closestX;
                const dy = localY - closestY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < bobRadius) {
                    const worldClosestX = wall.x + closestX * cos - closestY * sin;
                    const worldClosestY = wall.y + closestX * sin + closestY * cos;
                    
                    const normalX = (bobPos.x - worldClosestX) / dist;
                    const normalY = (bobPos.y - worldClosestY) / dist;
                    
                    const overlap = bobRadius - dist;
                    
                    if (pendulum.attachedTo !== null) {
                        const attachedBall = objects.find(o => o.id === pendulum.attachedTo);
                        if (attachedBall && attachedBall.type === 'ball') {
                            attachedBall.x += normalX * overlap;
                            attachedBall.y += normalY * overlap;
                            
                            const dotProduct = attachedBall.vx * normalX + attachedBall.vy * normalY;
                            attachedBall.vx -= 2 * dotProduct * normalX * pendulum.restitution;
                            attachedBall.vy -= 2 * dotProduct * normalY * pendulum.restitution;
                        }
                    } else {
                        const bobVx = Math.cos(pendulum.angle) * pendulum.angularVel * pendulum.length;
                        const bobVy = -Math.sin(pendulum.angle) * pendulum.angularVel * pendulum.length;
                        
                        const dotProduct = bobVx * normalX + bobVy * normalY;
                        
                        const impulse = -2 * dotProduct * pendulum.mass * pendulum.restitution;
                        
                        pendulum.angularVel += impulse / (pendulum.mass * pendulum.length);
                    }
                }
            });
        });

        balls.forEach((b1, i) => {
            balls.slice(i + 1).forEach(b2 => {
                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const minDist = b1.radius + b2.radius;
                
                if (dist < minDist && dist > 0.001) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    
                    const dvx = b2.vx - b1.vx;
                    const dvy = b2.vy - b1.vy;
                    
                    const dvn = dvx * nx + dvy * ny;
                    
                    if (dvn < 0) {
                        const overlap = minDist - dist;
                        
                        const separation = overlap * 0.5;
                        b1.x -= nx * separation;
                        b1.y -= ny * separation;
                        b2.x += nx * separation;
                        b2.y += ny * separation;
                        
                        const restitution = (b1.restitution + b2.restitution) * 0.5;
                        
                        const impulse = 2 * dvn / (b1.mass + b2.mass);
                        
                        b1.vx += impulse * b2.mass * nx * restitution;
                        b1.vy += impulse * b2.mass * ny * restitution;
                        b2.vx -= impulse * b1.mass * nx * restitution;
                        b2.vy -= impulse * b1.mass * ny * restitution;
                    }
                }
            });
        });

        balls.forEach(ball => {
            pendulums.forEach(pendulum => {
                const bobPos = getPendulumBobPosition(pendulum);
                const bobRadius = 15;
                const ballRadius = ball.radius;
                
                const dx = bobPos.x - ball.x;
                const dy = bobPos.y - ball.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const minDist = ballRadius + bobRadius;
                
                if (dist < minDist && dist > 0.001) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    
                    if (pendulum.attachedTo !== null) {
                        const attachedBall = objects.find(o => o.id === pendulum.attachedTo);
                        if (attachedBall && attachedBall.type === 'ball') {
                            const dvx = attachedBall.vx - ball.vx;
                            const dvy = attachedBall.vy - ball.vy;
                            const dvn = dvx * nx + dvy * ny;
                            
                            if (dvn < 0) {
                                const overlap = minDist - dist;
                                const separation = overlap * 0.5;
                                ball.x -= nx * separation;
                                ball.y -= ny * separation;
                                attachedBall.x += nx * separation;
                                attachedBall.y += ny * separation;
                                
                                const restitution = (ball.restitution + pendulum.restitution) * 0.5;
                                const impulse = 2 * dvn / (ball.mass + pendulum.mass);
                                
                                ball.vx += impulse * pendulum.mass * nx * restitution;
                                ball.vy += impulse * pendulum.mass * ny * restitution;
                                attachedBall.vx -= impulse * ball.mass * nx * restitution;
                                attachedBall.vy -= impulse * ball.mass * ny * restitution;
                            }
                        }
                    } else {
                        const bobVx = Math.cos(pendulum.angle) * pendulum.angularVel * pendulum.length;
                        const bobVy = -Math.sin(pendulum.angle) * pendulum.angularVel * pendulum.length;
                        
                        const dvx = bobVx - ball.vx;
                        const dvy = bobVy - ball.vy;
                        const dvn = dvx * nx + dvy * ny;
                        
                        if (dvn < 0) {
                            const overlap = minDist - dist;
                            const separation = overlap * 0.5;
                            ball.x -= nx * separation;
                            ball.y -= ny * separation;
                            
                            const restitution = (ball.restitution + pendulum.restitution) * 0.5;
                            const impulse = 2 * dvn / (ball.mass + pendulum.mass);
                            
                            ball.vx += impulse * pendulum.mass * nx * restitution;
                            ball.vy += impulse * pendulum.mass * ny * restitution;
                            
                            pendulum.angularVel -= impulse / (pendulum.mass * pendulum.length);
                        }
                    }
                }
            });
        });
    }

    const springs = objects.filter(o => o.type === 'spring');
    springs.forEach(spring => {
        if (spring.attachedTo !== null) {
            const attachedBall = objects.find(o => o.id === spring.attachedTo);
            if (attachedBall && attachedBall.type === 'ball') {
                const dx = attachedBall.x - spring.x;
                const dy = attachedBall.y - spring.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const displacement = dist - spring.length;
                const force = spring.k * displacement * 0.01;
                
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                attachedBall.vx -= fx / attachedBall.mass * dt * 10;
                attachedBall.vy -= fy / attachedBall.mass * dt * 10;
            }
        }
    });
}

function animate(currentTime = 0) {
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (dt > 0 && dt < 0.1) {
        updatePhysics(dt);
    }

    drawScene();

    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

function loadPreset(name) {
    clearCanvas();
    
    if (name === 'bouncing_balls') {
        for (let i = 0; i < 5; i++) {
            const ball = JSON.parse(JSON.stringify(objectTemplates.ball));
            ball.x = 100 + i * 80;
            ball.y = 100 + Math.random() * 100;
            ball.vx = Math.random() * 250 - 2.5;
            ball.vy = Math.random() * 250 - 2.5;
            ball.color = `hsl(${i * 72}, 70%, 60%)`;
            ball.id = objectIdCounter++;
            ball.name = `ball_${ball.id}`;
            ball.trail = [];
            objects.push(ball);
        }
    } else if (name === 'pendulum_wave') {
        for (let i = 0; i < 10; i++) {
            const pendulum = JSON.parse(JSON.stringify(objectTemplates.pendulum));
            pendulum.x = 200 + i * 75;
            pendulum.y = 100;
            pendulum.length = 250;
            pendulum.angle = 0.5;
            pendulum.id = objectIdCounter++;
            pendulum.name = `pendulum_${pendulum.id}`;
            objects.push(pendulum);
            updateGlobalParam("gravity", 20);
        }
    } else if (name === 'collision_demo') {
        for (let i = 0; i < 3; i++) {
            const ball = JSON.parse(JSON.stringify(objectTemplates.ball));
            const wall = JSON.parse(JSON.stringify(objectTemplates.wall));
            wall.x = 700;
            wall.y = 500;
            wall.rotation = 3.14/2;
            ball.x = 100 + i * 120;
            ball.y = 580;
            ball.vx = 300;
            ball.mass = 1 + i * 0.5;
            ball.radius = 15 + i * 5;
            ball.color = `hsl(${i * 90}, 70%, 60%)`;
            ball.id = objectIdCounter++;
            ball.name = `ball_${ball.id}`;
            ball.trail = [];
            objects.push(ball);
            objects.push(wall);
        }
    }
    
    updateObjectList();
    drawScene();
}

function togglePresetDropdown() {
    isPresetDropdownOpen = !isPresetDropdownOpen;
    const dropdownList = document.getElementById('presetList');
    const dropdown = document.getElementById('presetDropdown');
    
    if (isPresetDropdownOpen) {
        dropdownList.classList.add('open');
        dropdown.classList.add('open');
    } else {
        dropdownList.classList.remove('open');
        dropdown.classList.remove('open');
    }
}

function selectPreset(presetId, presetName) {
    document.getElementById('selectedPreset').textContent = presetName;
    loadPreset(presetId);
    togglePresetDropdown();
    
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('presetDropdown');
    if (isPresetDropdownOpen && !dropdown.contains(e.target)) {
        togglePresetDropdown();
    }
});

function toggleAttachDropdown(objId) {
    if (openAttachDropdownId === objId) {
        const dropdownList = document.getElementById(`attachList_${objId}`);
        const dropdown = document.getElementById(`attachDropdown_${objId}`);
        dropdownList.classList.remove('open');
        dropdown.classList.remove('open');
        openAttachDropdownId = null;
    } else {
        if (openAttachDropdownId !== null) {
            const prevDropdownList = document.getElementById(`attachList_${openAttachDropdownId}`);
            const prevDropdown = document.getElementById(`attachDropdown_${openAttachDropdownId}`);
            if (prevDropdownList) {
                prevDropdownList.classList.remove('open');
            }
            if (prevDropdown) {
                prevDropdown.classList.remove('open');
            }
        }
        
        const dropdownList = document.getElementById(`attachList_${objId}`);
        const dropdown = document.getElementById(`attachDropdown_${objId}`);
        dropdownList.classList.add('open');
        dropdown.classList.add('open');
        openAttachDropdownId = objId;
    }
    
    event.stopPropagation();
}

function selectAttachBall(objId, ballId, ballName) {
    const obj = objects.find(o => o.id === objId);
    if (obj) {
        updateObjProp(objId, 'attachedTo', ballId);
    }
    
    document.getElementById(`selectedAttach_${objId}`).textContent = ballName;
    toggleAttachDropdown(objId);
    
    const dropdownList = document.getElementById(`attachList_${objId}`);
    if (dropdownList) {
        dropdownList.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.classList.add('active');
    }
}

document.addEventListener('click', (e) => {
    if (openAttachDropdownId !== null) {
        const dropdown = document.getElementById(`attachDropdown_${openAttachDropdownId}`);
        if (dropdown && !dropdown.contains(e.target)) {
            toggleAttachDropdown(openAttachDropdownId);
        }
    }
});

function showSaveModal() {
    document.getElementById('saveModal').classList.add('active');
}

function closeSaveModal() {
    document.getElementById('saveModal').classList.remove('active');
}

function saveSandbox() {
    const name = document.getElementById('saveName').value.trim();
    if (!name) {
        alert('Please enter a name');
        return;
    }

    const savedSandboxes = JSON.parse(localStorage.getItem('sandboxes') || '{}');
    savedSandboxes[name] = {
        objects: objects.map(obj => {
            const cleanObj = { ...obj };
            return cleanObj;
        }),
        settings: { ...settings },
        objectIdCounter: objectIdCounter,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('sandboxes', JSON.stringify(savedSandboxes));
    alert('Sandbox saved!');
    closeSaveModal();
}

function showLoadModal() {
    const savedSandboxes = JSON.parse(localStorage.getItem('sandboxes') || '{}');
    const list = document.getElementById('savedList');
    
    if (Object.keys(savedSandboxes).length === 0) {
        list.innerHTML = '<div class="no-selection">No saved sandboxes</div>';
    } else {
        list.innerHTML = Object.keys(savedSandboxes).map(name => `
            <div class="object-item">
                <div>
                    <div>${name}</div>
                    <div style="font-size: 0.8rem; opacity: 0.6;">${new Date(savedSandboxes[name].timestamp).toLocaleString()}</div>
                </div>
                <div>
                    <button class="sim-btn sim-btn-primary" style="padding: 0.3rem 1rem; margin-right: 0.5rem; font-size: 14px" onclick="loadSandbox('${name}')">Load</button>
                    <button class="delete-btn" onclick="deleteSandbox('${name}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('loadModal').classList.add('active');
}

function closeLoadModal() {
    document.getElementById('loadModal').classList.remove('active');
}

function loadSandbox(name) {
    const savedSandboxes = JSON.parse(localStorage.getItem('sandboxes') || '{}');
    const sandbox = savedSandboxes[name];
    
    if (sandbox) {
        if (isRunning) {
            toggleSimulation();
        }
        
        objects = sandbox.objects.map(obj => {
            const newObj = { ...obj };
            
            if (newObj.type === 'ball') {
                newObj.trail = newObj.trail || [];
            }
            
            if (newObj.type === 'ball') {
                newObj.vx = newObj.vx || 0;
                newObj.vy = newObj.vy || 0;
                if (isNaN(newObj.vx)) newObj.vx = 0;
                if (isNaN(newObj.vy)) newObj.vy = 0;
                if (Math.abs(newObj.vx) > 1000) newObj.vx = 0;
                if (Math.abs(newObj.vy) > 1000) newObj.vy = 0;
            } else if (newObj.type === 'pendulum') {
                newObj.angularVel = newObj.angularVel || 0;
                if (isNaN(newObj.angularVel)) newObj.angularVel = 0;
                if (Math.abs(newObj.angularVel) > 100) newObj.angularVel = 0;
                newObj.angle = newObj.angle || 0.5;
                newObj.restitution = newObj.restitution || 0.3;
            }
            
            return newObj;
        });
        
        settings = { ...sandbox.settings };
        objectIdCounter = sandbox.objectIdCounter || objects.length;

        document.getElementById('slider-gravity').value = settings.gravity;
        document.getElementById('val-gravity').textContent = settings.gravity;
        document.getElementById('slider-airRes').value = settings.airRes;
        document.getElementById('val-airRes').textContent = settings.airRes;
        
        document.getElementById('toggle-vectors').classList.toggle('active', settings.showVectors);
        document.getElementById('toggle-grid').classList.toggle('active', settings.showGrid);
        document.getElementById('toggle-trails').classList.toggle('active', settings.showTrails);
        document.getElementById('toggle-collision').classList.toggle('active', settings.collision);
        
        updateObjectList();
        drawScene();
        closeLoadModal();
    }
}

function deleteSandbox(name) {
    if (confirm(`Delete sandbox "${name}"?`)) {
        const savedSandboxes = JSON.parse(localStorage.getItem('sandboxes') || '{}');
        delete savedSandboxes[name];
        localStorage.setItem('sandboxes', JSON.stringify(savedSandboxes));
        showLoadModal();
    }
}

drawScene();