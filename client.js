import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js'
import Stats from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/stats.module.js'
import {
  CSS2DRenderer,
  CSS2DObject
} from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/renderers/CSS2DRenderer.js'

const scene = new THREE.Scene()

const light = new THREE.SpotLight(0xffffff, 1000)
light.position.set(12.5, 12.5, 12.5)
light.castShadow = true
light.shadow.mapSize.set(1024, 1024)
scene.add(light)

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(15, 15, 15)

const renderer = new THREE.WebGLRenderer()
renderer.shadowMap.enabled = true
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const labelRenderer = new CSS2DRenderer()
labelRenderer.setSize(window.innerWidth, window.innerHeight)
labelRenderer.domElement.style.position = 'absolute'
labelRenderer.domElement.style.top = '0px'
labelRenderer.domElement.style.pointerEvents = 'none'
document.body.appendChild(labelRenderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const pickableObjects = []

const loader = new GLTFLoader()
loader.load(
  'simplescene.glb',
  function (gltf) {
    gltf.scene.traverse(function (child) {
      if (child.isMesh) {
        if (child.name === 'Plane') child.receiveShadow = true
        else child.castShadow = true
        pickableObjects.push(child)
      }
    })
    scene.add(gltf.scene)
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
  },
  (error) => {
    console.error(error)
  }
)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
  render()
})

let ctrlDown = false
let lineId = 0
let line
let drawingLine = false
const measurementLabels = {}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Control') {
    ctrlDown = true
    controls.enabled = false
    renderer.domElement.style.cursor = 'crosshair'
  }
})

window.addEventListener('keyup', (event) => {
  if (event.key === 'Control') {
    ctrlDown = false
    controls.enabled = true
    renderer.domElement.style.cursor = 'pointer'
    if (drawingLine) {
      scene.remove(line)
      scene.remove(measurementLabels[lineId])
      drawingLine = false
    }
  }
})

const raycaster = new THREE.Raycaster()
let intersects = []
const mouse = new THREE.Vector2()

renderer.domElement.addEventListener('pointerdown', onClick, false)
function onClick() {
  if (ctrlDown) {
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObjects(pickableObjects, false)
    if (intersects.length > 0) {
      if (!drawingLine) {
        const points = [intersects[0].point, intersects[0].point.clone()]
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        line = new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.75, transparent: true })
        )
        line.frustumCulled = false
        scene.add(line)

        const measurementDiv = document.createElement('div')
        measurementDiv.className = 'measurementLabel'
        measurementDiv.innerText = '0.0m'
        const measurementLabel = new CSS2DObject(measurementDiv)
        measurementLabel.position.copy(intersects[0].point)
        measurementLabels[lineId] = measurementLabel
        scene.add(measurementLabels[lineId])
        drawingLine = true
      } else {
        const pos = line.geometry.attributes.position.array
        pos[3] = intersects[0].point.x
        pos[4] = intersects[0].point.y
        pos[5] = intersects[0].point.z
        line.geometry.attributes.position.needsUpdate = true
        lineId++
        drawingLine = false
      }
    }
  }
}

document.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1
  mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1

  if (drawingLine) {
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObjects(pickableObjects, false)
    if (intersects.length > 0) {
      const pos = line.geometry.attributes.position.array
      const v0 = new THREE.Vector3(pos[0], pos[1], pos[2])
      const v1 = intersects[0].point
      pos[3] = v1.x
      pos[4] = v1.y
      pos[5] = v1.z
      line.geometry.attributes.position.needsUpdate = true
      const distance = v0.distanceTo(v1)
      measurementLabels[lineId].element.innerText = distance.toFixed(2) + 'm'
      measurementLabels[lineId].position.lerpVectors(v0, v1, 0.5)
    }
  }
})

const stats = new Stats()
document.body.appendChild(stats.dom)

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  render()
  stats.update()
}

function render() {
  labelRenderer.render(scene, camera)
  renderer.render(scene, camera)
}

animate()
