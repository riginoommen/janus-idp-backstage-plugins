import { loggerToWinstonLogger } from '@backstage/backend-common';
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { BackendDynamicPluginInstaller } from '@backstage/backend-plugin-manager';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';

import { ManagedClusterProvider } from '../providers';
import { ocmPlugin } from '../service/router';

export const dynamicPluginInstaller: BackendDynamicPluginInstaller = {
  kind: 'new',
  install: () => [
    createBackendModule({
      moduleId: 'catalog-backend-module-ocm',
      pluginId: 'catalog',
      register(env) {
        env.registerInit({
          deps: {
            catalog: catalogProcessingExtensionPoint,
            // TODO(davidfestal): This should be coreServices.rootConfig when de dependency to
            // backend-plugin-api is upgraded.
            config: coreServices.rootConfig,
            logger: coreServices.logger,
            scheduler: coreServices.scheduler,
          },
          async init({ catalog, config, logger, scheduler }) {
            catalog.addEntityProvider(
              ManagedClusterProvider.fromConfig(config, {
                logger: loggerToWinstonLogger(logger),
                schedule: scheduler.createScheduledTaskRunner({
                  frequency: { hours: 1 },
                  timeout: { minutes: 15 },
                  initialDelay: { seconds: 15 },
                }),
                scheduler: scheduler,
              }),
            );
          },
        });
      },
    })(),
    ocmPlugin(),
  ],
};