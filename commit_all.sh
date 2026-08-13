#!/bin/bash
echo "# SosEmergencyPrototype" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote remove origin
git remote add origin https://github.com/Anurag000003/SosEmergencyPrototype.git
git push -u origin main

git add "frontend/types/index.ts"
git commit -m "feat: added frontend/types/index.ts"
git push origin main

git add "frontend/tailwind.config.js"
git commit -m "feat: added frontend/tailwind.config.js"
git push origin main

git add "frontend/app/index.tsx"
git commit -m "feat: added frontend/app/index.tsx"
git push origin main

git add "frontend/app/(root)/verify-image.tsx"
git commit -m "feat: added frontend/app/(root)/verify-image.tsx"
git push origin main

git add "frontend/app/(root)/(tabs)/index.tsx"
git commit -m "feat: added frontend/app/(root)/(tabs)/index.tsx"
git push origin main

git add "frontend/app/(root)/(tabs)/alerts.tsx"
git commit -m "feat: added frontend/app/(root)/(tabs)/alerts.tsx"
git push origin main

git add "frontend/app/(root)/(tabs)/profile.tsx"
git commit -m "feat: added frontend/app/(root)/(tabs)/profile.tsx"
git push origin main

git add "frontend/app/(root)/(tabs)/_layout.tsx"
git commit -m "feat: added frontend/app/(root)/(tabs)/_layout.tsx"
git push origin main

git add "frontend/app/(root)/_layout.tsx"
git commit -m "feat: added frontend/app/(root)/_layout.tsx"
git push origin main

git add "frontend/app/+not-found.tsx"
git commit -m "feat: added frontend/app/+not-found.tsx"
git push origin main

git add "frontend/app/_layout.tsx"
git commit -m "feat: added frontend/app/_layout.tsx"
git push origin main

git add "frontend/app/(auth)/sign-in.tsx"
git commit -m "feat: added frontend/app/(auth)/sign-in.tsx"
git push origin main

git add "frontend/app/(auth)/_layout.tsx"
git commit -m "feat: added frontend/app/(auth)/_layout.tsx"
git push origin main

git add "frontend/app/(auth)/sign-up.tsx"
git commit -m "feat: added frontend/app/(auth)/sign-up.tsx"
git push origin main

git add "frontend/LICENSE"
git commit -m "feat: added frontend/LICENSE"
git push origin main

git add "frontend/app.json"
git commit -m "feat: added frontend/app.json"
git push origin main

git add "frontend/global.css"
git commit -m "feat: added frontend/global.css"
git push origin main

git add "frontend/expo-env.d.ts"
git commit -m "feat: added frontend/expo-env.d.ts"
git push origin main

git add "frontend/.claude/settings.json"
git commit -m "feat: added frontend/.claude/settings.json"
git push origin main

git add "frontend/utils/imageUtils.ts"
git commit -m "feat: added frontend/utils/imageUtils.ts"
git push origin main

git add "frontend/utils/formatUtils.ts"
git commit -m "feat: added frontend/utils/formatUtils.ts"
git push origin main

git add "frontend/components/ui/Card.tsx"
git commit -m "feat: added frontend/components/ui/Card.tsx"
git push origin main

git add "frontend/components/ui/Button.tsx"
git commit -m "feat: added frontend/components/ui/Button.tsx"
git push origin main

git add "frontend/components/FilterModal.tsx"
git commit -m "feat: added frontend/components/FilterModal.tsx"
git push origin main

git add "frontend/components/MeshStatusCard.tsx"
git commit -m "feat: added frontend/components/MeshStatusCard.tsx"
git push origin main

git add "frontend/components/MediaPicker.tsx"
git commit -m "feat: added frontend/components/MediaPicker.tsx"
git push origin main

git add "frontend/components/AuthProvider.tsx"
git commit -m "feat: added frontend/components/AuthProvider.tsx"
git push origin main

git add "frontend/components/EmergencyBanner.tsx"
git commit -m "feat: added frontend/components/EmergencyBanner.tsx"
git push origin main

git add "frontend/nativewind-env.d.ts"
git commit -m "feat: added frontend/nativewind-env.d.ts"
git push origin main

git add "frontend/metro.config.js"
git commit -m "feat: added frontend/metro.config.js"
git push origin main

git add "frontend/public/image.png"
git commit -m "feat: added frontend/public/image.png"
git push origin main

git add "frontend/babel.config.js"
git commit -m "feat: added frontend/babel.config.js"
git push origin main

git add "frontend/package-lock.json"
git commit -m "feat: added frontend/package-lock.json"
git push origin main

git add "frontend/package.json"
git commit -m "feat: added frontend/package.json"
git push origin main

git add "frontend/.env"
git commit -m "feat: added frontend/.env"
git push origin main

git add "frontend/hooks/useUserSync.ts"
git commit -m "feat: added frontend/hooks/useUserSync.ts"
git push origin main

git add "frontend/hooks/useSupabase.ts"
git commit -m "feat: added frontend/hooks/useSupabase.ts"
git push origin main

git add "frontend/lib/utils.ts"
git commit -m "feat: added frontend/lib/utils.ts"
git push origin main

git add "frontend/lib/meshProtocol.ts"
git commit -m "feat: added frontend/lib/meshProtocol.ts"
git push origin main

git add "frontend/lib/bluetoothMeshService.ts"
git commit -m "feat: added frontend/lib/bluetoothMeshService.ts"
git push origin main

git add "frontend/lib/supabase.ts"
git commit -m "feat: added frontend/lib/supabase.ts"
git push origin main

git add "frontend/tsconfig.json"
git commit -m "feat: added frontend/tsconfig.json"
git push origin main

git add "frontend/eslint.config.js"
git commit -m "feat: added frontend/eslint.config.js"
git push origin main

git add "frontend/AGENTS.md"
git commit -m "feat: added frontend/AGENTS.md"
git push origin main

git add "frontend/.vscode/settings.json"
git commit -m "feat: added frontend/.vscode/settings.json"
git push origin main

git add "frontend/.vscode/extensions.json"
git commit -m "feat: added frontend/.vscode/extensions.json"
git push origin main

git add "frontend/CLAUDE.md"
git commit -m "feat: added frontend/CLAUDE.md"
git push origin main

git add "frontend/store/userStore.ts"
git commit -m "feat: added frontend/store/userStore.ts"
git push origin main

git add "frontend/store/filterStore.ts"
git commit -m "feat: added frontend/store/filterStore.ts"
git push origin main

git add "backend/diet_plan.py"
git commit -m "feat: added backend/diet_plan.py"
git push origin main

git add "backend/video_object_detector.py"
git commit -m "feat: added backend/video_object_detector.py"
git push origin main

git add "backend/health_tips.py"
git commit -m "feat: added backend/health_tips.py"
git push origin main

git add "backend/image_recognizer.py"
git commit -m "feat: added backend/image_recognizer.py"
git push origin main

git add "backend/preprocessing.py"
git commit -m "feat: added backend/preprocessing.py"
git push origin main

git add "backend/main.py"
git commit -m "feat: added backend/main.py"
git push origin main
