import { Config, StateStore } from '../types';
import DefaultStateStore from './default-state-store';
import { ContextService, createContextService } from './context';
import * as jwt from './jwt';
import { createLogger, Logger } from './logger';
import * as purchaseToken from './purchase-token-decoder';
import { createTokenService, TokenService } from './token-service';
import { createNotificationService, NotificationService } from './notification-service';
import { ConfigFileService, createConfigFileService } from './config-file-service';

export interface ServicesContainer {
  jwt: typeof jwt;
  purchaseToken: typeof purchaseToken;
  stateStore: StateStore;
  config: Config;
  context: ContextService;
  tokens: TokenService;
  notifications: NotificationService;
  logger: Logger;
  configFiles: ConfigFileService;
}

export const createServicesContainer = (config: Config): ServicesContainer => {
  const contextService = createContextService();
  const notifications = createNotificationService(contextService);

  const logger = createLogger(contextService);

  const stateStore = new DefaultStateStore(config, logger);
  stateStore.load().catch((x) => {
    console.log(x);
  });

  const configFiles = createConfigFileService(config.fileLocation ?? './config', logger);

  // Load config files asynchronously
  Promise.all([
    configFiles.loadCspPartners(),
    configFiles.loadCustomers()
  ]).then(([cspPartners, customers]) => {
    config.cspPartners = cspPartners;
    config.customers = customers;
  }).catch((x) => {
    console.log('Error loading config files:', x);
  });

  return {
    jwt,
    purchaseToken,
    stateStore,
    config,
    context: contextService,
    tokens: createTokenService(),
    notifications,
    logger,
    configFiles
  };
};
