# LeCode - Collaborative Code Editor

A real-time collaborative code editor with breakout room functionality.

## Deployment Instructions

### Client (Vercel)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel:
   - `VITE_BACKEND_URL`: Your Render server URL (e.g., `https://your-server-name.onrender.com`)
4. Deploy

### Server (Render)

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables:
   - `NODE_ENV`: `production`
7. Deploy

### Environment Variables

#### Client (.env.local)
```
VITE_BACKEND_URL=http://localhost:5000
```

#### Server
- `PORT`: Automatically set by Render
- `NODE_ENV`: production

## Development

```bash
# Install dependencies
npm install

# Start client
cd client && npm run dev

# Start server
cd server && npm run dev
```
