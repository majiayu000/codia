import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export interface VRMLoadResult {
  vrm: VRM;
  scene: THREE.Group;
}

export interface VRMServiceOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

interface GLTFWithVRM extends GLTF {
  userData: {
    vrm?: VRM;
  };
}

const vrmCache = new Map<string, VRM>();
const loadingPromises = new Map<string, Promise<VRM>>();

export async function loadVRM(
  url: string,
  options: VRMServiceOptions = {}
): Promise<VRM> {
  // Return cached VRM if available
  if (vrmCache.has(url)) {
    return vrmCache.get(url)!;
  }

  // Return existing loading promise if already loading
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  const loadPromise = new Promise<VRM>(async (resolve, reject) => {
    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await new Promise<GLTFWithVRM>((res, rej) => {
        loader.load(
          url,
          (gltf) => res(gltf as GLTFWithVRM),
          (progress) => {
            if (options.onProgress && progress.total > 0) {
              options.onProgress((progress.loaded / progress.total) * 100);
            }
          },
          (error) => rej(error)
        );
      });

      const vrm = gltf.userData.vrm;

      if (!vrm) {
        throw new Error("Failed to load VRM: No VRM data found in file");
      }

      // Optimize VRM
      VRMUtils.removeUnnecessaryJoints(vrm.scene);
      VRMUtils.removeUnnecessaryVertices(vrm.scene);

      // Rotate model to face camera (VRM models face +Z by default)
      vrm.scene.rotation.y = Math.PI;

      // Cache the VRM
      vrmCache.set(url, vrm);
      loadingPromises.delete(url);

      resolve(vrm);
    } catch (error) {
      loadingPromises.delete(url);
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);
      reject(err);
    }
  });

  loadingPromises.set(url, loadPromise);
  return loadPromise;
}

export function disposeVRM(url: string): void {
  const vrm = vrmCache.get(url);
  if (vrm) {
    VRMUtils.deepDispose(vrm.scene);
    vrmCache.delete(url);
  }
}

export function clearVRMCache(): void {
  vrmCache.forEach((vrm) => {
    VRMUtils.deepDispose(vrm.scene);
  });
  vrmCache.clear();
}

export function getLoadedVRMs(): string[] {
  return Array.from(vrmCache.keys());
}

export function isVRMLoaded(url: string): boolean {
  return vrmCache.has(url);
}
