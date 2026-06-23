# Nino Deployment Guide

## Pre-Deployment Checklist

### Environment Setup
- [ ] `DATABASE_URL` is set in Vercel environment variables (auto from Neon)
- [ ] `BETTER_AUTH_SECRET` is generated and set (use `openssl rand -base64 32`)
- [ ] Database migrations are complete
- [ ] Test account created and authentication works locally

### Testing
- [ ] Build succeeds: `pnpm build`
- [ ] Dev server runs: `pnpm dev`
- [ ] Sign-up creates account successfully
- [ ] Sign-in works with created account
- [ ] Chat streaming works
- [ ] Voice input/output functional (test in Chrome/Edge)
- [ ] Memories persist across sessions
- [ ] 3D orb renders without errors
- [ ] Settings save correctly
- [ ] All AI providers are accessible (if using custom API keys)

## Deployment Steps

### Option 1: Deploy via v0 UI (Recommended)

1. Click **"Publish"** button in top right of v0
2. Select your **Vercel project** or create a new one
3. Verify environment variables are set:
   - Go to **Settings** → **Vars**
   - Confirm `DATABASE_URL` and `BETTER_AUTH_SECRET` are present
4. Click **Deploy**
5. Wait for build to complete (~2-3 minutes)

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel deploy

# Deploy to production
vercel deploy --prod
```

### Option 3: Deploy via GitHub

1. Push code to GitHub repository
2. Connect GitHub repo to Vercel
3. Vercel automatically deploys on push
4. Set environment variables in Vercel project settings

## Post-Deployment Verification

After deployment, verify:

1. **Access Application**
   - Visit your Vercel URL
   - Should redirect to sign-in page

2. **Test Authentication**
   - Create a new account
   - Sign in with the new account
   - Should redirect to chat page

3. **Test Chat**
   - Send a message
   - AI response should stream in
   - Message should persist in sidebar

4. **Check Logs**
   - Go to Vercel project → Deployments → Current
   - Click "View Logs"
   - Look for any errors or warnings

5. **Test Voice** (if supported by browser)
   - Click microphone icon
   - Speak a message
   - Should transcribe to input field

## Environment Variables in Vercel

### Auto-Provisioned (from Neon integration)
```
DATABASE_URL=postgresql://user:password@host:port/database
```

### Must Be Set Manually
```
BETTER_AUTH_SECRET=<your-random-secret>
```

**To add/update in Vercel:**
1. Go to **Project Settings** → **Environment Variables**
2. Add or update the variables
3. Redeploy for changes to take effect

## Troubleshooting Deployment Issues

### "Build failed"
- Check build logs in Vercel
- Verify all environment variables are set
- Ensure database is accessible
- Try building locally: `pnpm build`

### "Unauthorized" after deployment
- Verify `BETTER_AUTH_SECRET` is exactly correct
- Check database connection
- Ensure all Better Auth tables exist

### "Chat not streaming"
- Check that `/api/chat` endpoint is accessible
- Verify AI provider keys (if using custom keys)
- Check browser console for errors

### "Voice not working"
- Not all browsers support Web Speech API
- Works best in Chrome, Edge, Safari
- Requires HTTPS in production (Vercel provides this)
- Check microphone permissions

### "Memory not persisting"
- Verify database connection
- Check memories table exists
- Ensure user is authenticated
- Check API response in browser DevTools

## Performance Optimization

### For Production
1. **Enable Image Optimization**
   - Already configured in Next.js 16

2. **Database Optimization**
   - Create indexes on frequently queried columns
   - Monitor Neon usage

3. **API Optimization**
   - Response streaming is already configured
   - Consider caching for repeated queries

4. **Frontend Optimization**
   - Bundle size is optimized by default
   - CSS-in-JS is minimal (mostly Tailwind)

## Monitoring & Maintenance

### Weekly Checks
- [ ] Review Vercel logs for errors
- [ ] Test chat functionality
- [ ] Verify memory system is working
- [ ] Check database performance in Neon console

### Monthly Tasks
- [ ] Review memory system data
- [ ] Delete unused chat sessions
- [ ] Update AI provider API keys if needed
- [ ] Check for v0/dependency updates

## Scaling Considerations

As Nino grows:

1. **Database**
   - Neon handles auto-scaling
   - Monitor connection pool
   - Archive old chat sessions

2. **API Rate Limiting**
   - Consider adding rate limiting middleware
   - Monitor API usage

3. **AI Provider Costs**
   - Monitor API usage and costs
   - Consider implementing usage limits
   - Switch providers based on performance/cost

## Backup & Recovery

### Database Backup
Neon automatically backs up your database. To restore:
1. Go to Neon console
2. Find backup history
3. Restore to a point in time

### Code Backup
- GitHub repository serves as backup
- All deployments tracked in Vercel
- Can rollback to previous deployment

## Support

For deployment issues:
1. Check Vercel status: https://www.vercel.com/status
2. Review Neon status: https://neon.tech/status
3. Check GitHub/Vercel documentation
4. Review console logs and error messages

## Next Steps

Once deployed:
1. Share the URL with users
2. Monitor usage and feedback
3. Iterate on features
4. Consider adding more AI providers
5. Enhance memory extraction logic

Happy deploying! 🚀
