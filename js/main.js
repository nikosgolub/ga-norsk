import { tgInit } from './core/tg.js';
import { cloudRestore } from './core/store.js';
import { applyTheme } from './core/theme.js';
import { go } from './core/router.js';
import './screens/home.js';
import './screens/dialog.js';

tgInit();
applyTheme();
cloudRestore().catch(() => false).then(restored => { if(restored) applyTheme(); go('home'); });
