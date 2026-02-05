# Deployment and Rollback Guide

This guide will help you safely deploy changes and quickly rollback if something breaks.

## Table of Contents
1. [Version Control with Git](#version-control-with-git)
2. [Safe Deployment Workflow](#safe-deployment-workflow)
3. [Quick Rollback Procedures](#quick-rollback-procedures)
4. [Debugging Broken Deployments](#debugging-broken-deployments)
5. [Best Practices](#best-practices)

---

## Version Control with Git

### Why Git Matters
Git tracks every change to your code, allowing you to:
- See what changed and when
- Revert to any previous working state
- Tag stable versions for easy reference
- Compare different versions to find bugs

### Current Status
Your repository has been tagged with `v1.0-stable` - this is your known working version.

### Basic Git Commands

```bash
# Check current status
git status

# See recent commits
git log --oneline -10

# See what changed in a file
git diff src/components/ProductImageGallery.tsx

# View all tags (stable versions)
git tag -l
```

---

## Safe Deployment Workflow

### BEFORE Making Changes

1. **Create a checkpoint of the current working state**
   ```bash
   git add -A
   git commit -m "Checkpoint: Working state before [description of change]"
   git tag -a v1.X-stable -m "Stable version before [change]"
   ```

2. **Note the current production deployment**
   ```bash
   vercel ls --prod | head -5
   ```
   Save the deployment URL (first one listed)

### AFTER Making Changes

1. **Test locally first**
   ```bash
   npm run dev
   # Test in browser at http://localhost:5173
   ```

2. **Build and deploy**
   ```bash
   npm run build
   vercel --prod
   ```

3. **Wait for deployment to complete** (usually 30-60 seconds)

4. **Test on production URL**
   - Test on desktop AND mobile
   - Test ALL critical features
   - If anything is broken, rollback immediately (see below)

5. **If everything works, tag it**
   ```bash
   git add -A
   git commit -m "Feature: [description]"
   git tag -a v1.X-stable -m "Stable version with [feature]"
   ```

---

## Quick Rollback Procedures

### Method 1: Rollback via Vercel (Fastest - 30 seconds)

This rolls back the deployed version WITHOUT changing your local code.

```bash
# 1. List recent deployments
vercel ls --prod

# 2. Find the last working deployment (usually 2nd or 3rd in the list)
#    Look for one deployed before the problem started

# 3. Assign it to production
vercel alias set [DEPLOYMENT-URL] www.storehouse.ng

# Example:
# vercel alias set smartstock-v2-g0ew3t75a-pauls-projects-cfe953d7.vercel.app www.storehouse.ng
```

**When to use**: When you need to restore the site immediately while you fix the code.

### Method 2: Rollback via Git + Redeploy (5 minutes)

This rolls back BOTH your local code AND deployment.

```bash
# 1. Find the last working commit/tag
git tag -l
git log --oneline -20

# 2. Rollback your code to that tag
git checkout v1.0-stable

# 3. Create a new branch to save this state
git checkout -b rollback-temp

# 4. Deploy this version
npm run build
vercel --prod

# 5. Wait for deployment, then assign to production
vercel alias set [NEW-DEPLOYMENT-URL] www.storehouse.ng

# 6. Return to main branch and update it
git checkout main
git reset --hard v1.0-stable
```

**When to use**: When the broken changes are in your local code and you want to start fresh from a known good state.

### Method 3: Undo Last Commit (2 minutes)

This undoes your most recent commit.

```bash
# 1. Undo the last commit but keep the changes
git reset --soft HEAD~1

# 2. Review what changed
git diff

# 3. Remove the problematic changes
git restore [PROBLEMATIC-FILE]

# 4. Commit the good changes
git add [GOOD-FILES]
git commit -m "Reverted: [description]"

# 5. Deploy
npm run build
vercel --prod
```

**When to use**: When your last commit broke things and you want to undo just that commit.

---

## Debugging Broken Deployments

### Step 1: Identify What Broke

```bash
# Compare current code to last working version
git diff v1.0-stable

# See what changed in the last commit
git show HEAD

# Check specific file changes
git diff v1.0-stable src/components/ProductImageGallery.tsx
```

### Step 2: Check Deployment Logs

```bash
# Get the broken deployment URL from:
vercel ls --prod

# Check its logs
vercel inspect [DEPLOYMENT-URL] --logs
```

### Step 3: Test Locally

```bash
# Run the exact code that's deployed
npm run build
npm run preview  # This serves the built version locally
```

### Step 4: Narrow Down the Issue

1. **Rollback to last working version** (Method 1 above)
2. **Re-apply changes one at a time**
   ```bash
   # Cherry-pick specific commits
   git cherry-pick [COMMIT-HASH]

   # Test each change
   npm run build
   vercel --prod
   ```

---

## Best Practices

### 1. Always Commit Before Deploying

```bash
git add -A
git commit -m "Clear description of what changed"
```

This ensures you can rollback to this exact state later.

### 2. Tag Stable Versions

Every time you have a working deployment, tag it:

```bash
git tag -a v1.X-stable -m "Description of this version"
```

Increment the version number each time (v1.1-stable, v1.2-stable, etc.)

### 3. Test Changes Incrementally

- Make small changes
- Test each change before making the next
- Deploy frequently with small updates (easier to debug than big changes)

### 4. Keep a Deployment Log

Create a simple text file to track deployments:

```bash
echo "$(date): Deployed v1.X - [description] - URL: [deployment-url]" >> deployment-log.txt
```

### 5. Use Feature Branches for Risky Changes

```bash
# Create a branch for experimental features
git checkout -b feature/new-image-gallery

# Make changes, test, deploy to preview URL
vercel

# If it works, merge to main
git checkout main
git merge feature/new-image-gallery

# Deploy to production
vercel --prod
```

### 6. Always Have a Rollback Plan

Before deploying, ask yourself:
- What's the current working deployment URL?
- What's the current Git tag?
- How will I test this?
- What will I do if it breaks?

---

## Quick Reference Commands

### Check Current State
```bash
git status                    # What's changed locally
git log --oneline -10        # Recent commits
git tag -l                   # All stable versions
vercel ls --prod             # Recent deployments
```

### Deploy Safely
```bash
npm run build                # Build locally
vercel --prod                # Deploy to production
```

### Rollback Fast
```bash
vercel ls --prod                                    # List deployments
vercel alias set [OLD-URL] www.storehouse.ng       # Rollback
```

### Version Control
```bash
git add -A                                          # Stage all changes
git commit -m "Description"                        # Commit
git tag -a v1.X-stable -m "Stable version"        # Tag stable version
```

---

## Emergency Rollback Checklist

When something breaks in production:

- [ ] **STEP 1**: Stay calm - Vercel keeps all old deployments
- [ ] **STEP 2**: Run `vercel ls --prod`
- [ ] **STEP 3**: Find the last working deployment (before the break)
- [ ] **STEP 4**: Run `vercel alias set [OLD-URL] www.storehouse.ng`
- [ ] **STEP 5**: Verify site is working again
- [ ] **STEP 6**: Now you can calmly debug the issue

**Time to rollback: 30 seconds**

---

## Current Stable Version

**Tag**: `v1.0-stable`
**Date**: 2026-01-10
**Description**: CSS background-image lightbox (working state)
**Features**:
- Product image gallery with CSS background-image
- Lightbox opens on tap (mobile) or click (desktop)
- Thumbnail navigation
- Swipe support

**Known Issues**:
- First tap may show intermediate image briefly (minor UX issue)
- Subsequent taps work perfectly

---

## Need Help?

If you're unsure about something:

1. **Check what's currently deployed**
   ```bash
   vercel ls --prod
   ```

2. **Check your local code state**
   ```bash
   git status
   git log --oneline -5
   ```

3. **Compare to last stable version**
   ```bash
   git diff v1.0-stable
   ```

4. **When in doubt, rollback to v1.0-stable** (see Method 2 above)
