# Media

## Summary
Digital asset manager with upload, grid/list browsing, folder organization, visibility (public/private), sharing, and record linking. Reusable `MediaPickerDialog` for record-level media selection/upload.

## What We Done
- `media-client.ts` — `listMediaAssets` (with folder/search/visibility filters), `uploadMediaAsset` (POST base64), `deleteMediaAsset`, `shareMediaAsset`, `linkMediaAsset`, `mediaContentBlobUrl` (fetches blob for preview), `fileToBase64`. Types: `MediaAsset`, `MediaUploadInput`, `MediaAssetLink`, `MediaVisibility`.
- `media-page.tsx` — `MediaManagerPage` with toolbar (search, folder, visibility filter, grid/list toggle), folder pill buttons, grid/list views, `MediaInspector` sidebar (detail panel with copy link, share, open, copy ID, link to record, delete). Image preview via `mediaContentBlobUrl` blob URLs. Upload panel with folder + visibility selector.
- `media-picker-dialog.tsx` — Reusable `MediaPickerDialog` with search, folder filter, visibility, upload, and double-click/button select. Supports `accept`, `fixedFolder`, `uploadVisibility`, `uploadFileName`. Uses portal dialog.

## Gaps
- No drag-and-drop upload zone in picker.
- No bulk download or multi-select operations.
- No image editing/cropping before upload.

## Future Concepts
- Drag-and-drop upload with progress indicator.
- Image editor (crop, resize, rotate) before upload.
- Bulk download as zip.
- Media CDN / image optimization via URL transformation parameters.
- Folder tree navigation instead of flat text input.
