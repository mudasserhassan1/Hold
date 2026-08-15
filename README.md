# Hold

Screen time app. Opening Instagram or TikTok hits an escalating pause so you can go Home on purpose.

Store name: **Hold: Screen Time & App Blocker**  
Bundle ID: `app.hold.focus`  
Stack: React Native CLI (not Expo). Local builds only.

## Run (Android)

```bash
npm start
npm run android
```

On a phone (USB debugging on):

1. Open Hold and finish onboarding.
2. Grant **Usage access** and **Display over other apps**.
3. Pick an app (Instagram, TikTok, YouTube, and others that are installed).
4. Turn Hold on, press Home, open that app. You should see the pause.

Free is one app. Pro is every app you select. Yearly ($34.99) is the default.

Play Billing is not connected yet. **Start Pro** still unlocks Pro on this install so you can try the paid path. Clear app storage to reset.

iOS comes after the $99 Apple Developer enrollment. Screen Time APIs do not work in the iOS Simulator.

```bash
cd ios && bundle install && bundle exec pod install && cd ..
```
