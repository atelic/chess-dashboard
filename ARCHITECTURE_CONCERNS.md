# Architecture Concerns

Future considerations for scaling and improving the chess dashboard.

## API Rate Limiting

Both Chess.com and Lichess have rate limits that may affect users with large game histories.

### Chess.com
- No official rate limit documentation, but aggressive fetching can result in 429 errors
- Monthly archive system means many requests for full history

### Lichess
- 20 requests per second for API
- Game export endpoint streams NDJSON, more efficient for bulk fetching

### Potential Solutions
- [ ] Implement request queue with configurable delay between requests
- [ ] Add exponential backoff on 429 responses
- [ ] Cache archive URLs to avoid refetching
- [ ] Show progress indicator for large syncs
- [ ] Consider background sync with notifications

## Analysis Performance

Stockfish WASM runs in the browser and is significantly slower than native Stockfish.

### Benchmarks (approximate)
- Native Stockfish: 10-50M nodes/second
- Stockfish WASM (single thread): 500K-1M nodes/second
- Stockfish WASM (multi-thread): 1-3M nodes/second

### Considerations
- Depth 15-18 is reasonable for browser analysis (~1-5 seconds per position)
- Full game analysis (30-40 moves) takes 1-3 minutes
- Multi-threading requires SharedArrayBuffer and special CORS headers

### Potential Solutions
- [ ] Implement progressive deepening (quick shallow analysis, then deepen on demand)
- [ ] Only analyze critical positions (evaluation swings, blunders)
- [ ] Use Lichess Cloud Eval API for common positions (instant, high depth)
- [ ] Background worker queue to prevent UI blocking
- [ ] Cache analysis results in SQLite to avoid re-analysis
- [ ] Consider server-side analysis for batch processing

## CORS Headers Impact

SharedArrayBuffer requires specific headers that may affect third-party integrations:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### Potential Issues
- Third-party scripts may not work (analytics, etc.)
- Embedded content from other origins may fail
- OAuth popups may be affected

### Potential Solutions
- [ ] Make multi-threaded Stockfish opt-in
- [ ] Use single-threaded fallback when headers not present
- [ ] Test thoroughly with all planned integrations

## Storage Growth

Analysis data can grow significantly for active users.

### Estimates
- Per-move analysis: ~100-200 bytes per move (JSON)
- Average game: ~40 moves = 4-8KB per game analysis
- 1000 games fully analyzed: 4-8MB

### Potential Solutions
- [ ] Compress move_analyses JSON (gzip or custom format)
- [ ] Prune detailed analysis after N days, keep only summary
- [ ] Lazy load detailed analysis on demand
- [ ] Consider IndexedDB for large blob storage
- [ ] Implement data export/import for backup

## Offline Support

Users may want to access their data without internet.

### Current State
- SQLite database is local, so game data persists
- API calls fail without network
- Analysis requires network for cloud eval

### Potential Solutions
- [ ] Implement PWA with service worker
- [ ] Cache Stockfish WASM files for offline analysis
- [ ] Add offline indicator in UI
- [ ] Queue syncs for when network returns

## Multi-threading Requirements

SharedArrayBuffer requires HTTPS in production.

### Development
- localhost is allowed
- HTTP works in development

### Production
- Must use HTTPS
- Self-signed certificates won't work in most browsers

### Deployment Considerations
- [ ] Ensure production deployment uses HTTPS
- [ ] Vercel/Netlify handle this automatically
- [ ] Self-hosted deployments need SSL certificate

## Future Scalability

### Multi-user Support
Currently single-user, but schema supports multiple users.
- [ ] Add user authentication
- [ ] Implement user isolation in all queries
- [ ] Consider data privacy implications

### Mobile Support
- [ ] Test Stockfish WASM on mobile browsers
- [ ] Optimize charts for touch interaction
- [ ] Consider reducing analysis depth on mobile (battery/performance)

### Data Sync
- [ ] Consider cloud sync for cross-device access
- [ ] Implement conflict resolution for concurrent edits
- [ ] Add export to Chess.com/Lichess study format
