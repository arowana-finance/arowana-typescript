# @arowanadao/eslint

[![NPM Version](https://img.shields.io/npm/v/@arowanadao/eslint)](https://www.npmjs.com/package/@arowanadao/eslint)

Common ESLint config for Arowana projects

### Install

Would install all necessary eslint dependencies for typescript development as well

```bash
$ yarn add -D @arowanadao/eslint
```

Then use it with the following

```js
import tseslint from 'typescript-eslint';
import { getConfig } from '@arowanadao/eslint';

export default tseslint.config(getConfig());
```