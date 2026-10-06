import * as THREE from 'three'

export interface ToothShell {
    geometry: THREE.BufferGeometry
    /** Bounding box centre of the model, in the root's object space. */
    center: THREE.Vector3
    /** Largest extent of the model - used to normalise the shader space. */
    size: number
    /**
     * The model's metallicRoughness map, if it has one. The crown and the
     * titanium post are one mesh sharing one material and are told apart only
     * by this texture, so it is the only way to keep the shield off the metal.
     */
    metalnessMap: THREE.Texture | null
}

export interface ToothShellOptions {
    /** How far the shell floats off the enamel, as a fraction of the model size. */
    inflate?: number
}

/**
 * Builds the shield surface: the model's own geometry, pushed out along its
 * normals by a hair.
 *
 * It is deliberately the *same* geometry rather than a fitted proxy - every
 * cusp, groove and the collar under the crown stay exactly where they are, so
 * the shield reads as a skin on the tooth instead of a bubble around it.
 *
 * `inflate` has to stay small for a second reason beyond looks: offsetting a
 * surface along its normals folds it through itself wherever the offset exceeds
 * the local radius of curvature. On this model that happens first at the lip
 * under the crown, where the enamel curves back in towards the collar - the
 * fold showed up as a torn, sparkling ring right at that edge. Depth separation
 * is handled by the material's polygon offset instead, so this stays cosmetic.
 */
export function buildToothShell(root: THREE.Object3D, options: ToothShellOptions = {}): ToothShell | null {
    const { inflate = 0.004 } = options

    root.updateWorldMatrix(true, true)

    const meshes: THREE.Mesh[] = []
    root.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (mesh.isMesh && mesh.geometry?.attributes?.position) meshes.push(mesh)
    })
    if (!meshes.length) return null

    const toLocal = new THREE.Matrix4().copy(root.matrixWorld).invert()

    let vertexTotal = 0
    let indexTotal = 0
    const parts: {
        position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute
        normal: THREE.BufferAttribute | THREE.InterleavedBufferAttribute
        uv: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null
        index: ArrayLike<number> | null
        matrix: THREE.Matrix4
        normalMatrix: THREE.Matrix3
        count: number
    }[] = []

    let metalnessMap: THREE.Texture | null = null

    for (const mesh of meshes) {
        const geometry = mesh.geometry
        if (!geometry.attributes.normal) geometry.computeVertexNormals()

        if (!metalnessMap) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const material of materials) {
                const map = (material as THREE.MeshStandardMaterial)?.metalnessMap
                if (map) {
                    metalnessMap = map
                    break
                }
            }
        }

        const matrix = new THREE.Matrix4().multiplyMatrices(toLocal, mesh.matrixWorld)
        const count = geometry.attributes.position.count
        const index = geometry.index ? geometry.index.array : null

        parts.push({
            position: geometry.attributes.position,
            normal: geometry.attributes.normal,
            uv: geometry.attributes.uv ?? null,
            index,
            matrix,
            // Normals do not transform by the matrix itself once there is any
            // non-uniform scale in the chain, which the GLB's node graph has.
            normalMatrix: new THREE.Matrix3().getNormalMatrix(matrix),
            count,
        })

        vertexTotal += count
        indexTotal += index ? index.length : count
    }

    const positions = new Float32Array(vertexTotal * 3)
    const normals = new Float32Array(vertexTotal * 3)
    // Always allocated, even when the source has no UVs - a ShaderMaterial that
    // reads `uv` warns on every draw if the attribute is missing entirely.
    const uvs = new Float32Array(vertexTotal * 2)
    const indices = vertexTotal > 65535 ? new Uint32Array(indexTotal) : new Uint16Array(indexTotal)

    const v = new THREE.Vector3()
    const n = new THREE.Vector3()
    const min = new THREE.Vector3(Infinity, Infinity, Infinity)
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)

    let vertexOffset = 0
    let indexOffset = 0

    for (const part of parts) {
        for (let i = 0; i < part.count; i++) {
            v.fromBufferAttribute(part.position, i).applyMatrix4(part.matrix)
            n.fromBufferAttribute(part.normal, i).applyMatrix3(part.normalMatrix).normalize()

            if (part.uv) {
                const uvOffset = (vertexOffset + i) * 2
                uvs[uvOffset] = part.uv.getX(i)
                uvs[uvOffset + 1] = part.uv.getY(i)
            }

            const o = (vertexOffset + i) * 3
            positions[o] = v.x
            positions[o + 1] = v.y
            positions[o + 2] = v.z
            normals[o] = n.x
            normals[o + 1] = n.y
            normals[o + 2] = n.z

            min.min(v)
            max.max(v)
        }

        if (part.index) {
            for (let i = 0; i < part.index.length; i++) {
                indices[indexOffset + i] = part.index[i] + vertexOffset
            }
            indexOffset += part.index.length
        } else {
            for (let i = 0; i < part.count; i++) {
                indices[indexOffset + i] = vertexOffset + i
            }
            indexOffset += part.count
        }

        vertexOffset += part.count
    }

    const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 1e-5)
    const offset = inflate * size

    // The push happens after the bounds are measured, so `size` describes the
    // tooth and the shader's normalised space does not drift with `inflate`.
    for (let i = 0; i < vertexTotal; i++) {
        const o = i * 3
        positions[o] += normals[o] * offset
        positions[o + 1] += normals[o + 1] * offset
        positions[o + 2] += normals[o + 2] * offset
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    // The source normals are reused as-is: recomputing them here would only
    // re-derive the same directions from a surface that was just moved along them.
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()

    return {
        geometry,
        center: new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5),
        size,
        metalnessMap,
    }
}
