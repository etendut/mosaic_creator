import type { Catalog } from '../mosaic/types';
import json from './catalog.json';

export const DEFAULT_BRICK_ID = '98138';
export const DEFAULT_PLATE_ID = '4166619';

// JSON imports type string fields as plain strings; the build script only writes valid colour types and profiles
export const catalog = json as Catalog;
