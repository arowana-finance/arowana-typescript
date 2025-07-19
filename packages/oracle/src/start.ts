#!/usr/bin/env node
import { syncPrice } from './syncPrice.js';
import { syncSupply } from './syncSupply.js';

syncPrice();
syncSupply();
