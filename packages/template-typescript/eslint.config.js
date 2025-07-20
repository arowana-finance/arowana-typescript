import tseslint from 'typescript-eslint';
import { getConfig } from '@arowanadao/eslint';

export default tseslint.config(getConfig());
