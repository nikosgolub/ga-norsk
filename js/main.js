import { tgInit } from './core/tg.js';
import { cloudRestore } from './core/store.js';
import { applyTheme } from './core/theme.js';
import { importLegacy } from './core/legacy.js';
import { go, onShow } from './core/router.js';
import { mountMini } from './features/miniplayer.js';
import './screens/home.js';
import './screens/dialog.js';
import './screens/cards.js';
import './screens/onboarding.js';
import { state } from './core/store.js';

onShow(mountMini);
tgInit();
applyTheme();
cloudRestore().catch(() => false)
  .then(() => importLegacy().catch(() => false))
  .then(() => { applyTheme(); go('home'); if(!state.onboarded) go('onboarding'); });
