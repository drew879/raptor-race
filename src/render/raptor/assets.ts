import velociraptorUrl from '../../assets/models/velociraptor.rrm?inline';
import { decodeRrmDataUrl, type RrmBody } from './rrm';

let cache: RrmBody | null = null;
/** Blender-built Velociraptor body (scripts/blender/raptor.py), decoded once. */
export function velociraptorBody(): RrmBody {
  return (cache ??= decodeRrmDataUrl(velociraptorUrl));
}
