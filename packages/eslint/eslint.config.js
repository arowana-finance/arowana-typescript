import tseslint from 'typescript-eslint';
import { getConfig } from './index.js';

export default tseslint.config(getConfig());
