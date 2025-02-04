import { getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';

import express from 'express';
import { setupServer } from 'msw/node';
import request from 'supertest';

import { handlers } from '../../__fixtures__/handlers';
import { createRouter } from './router';

const server = setupServer(...handlers);

beforeAll(() =>
  server.listen({
    /*
     *  This is required so that msw doesn't throw
     *  warnings when the express app is requesting an endpoint
     */
    onUnhandledRequest: 'bypass',
  }),
);
afterEach(() => server.restoreHandlers());
afterAll(() => server.close());

const logger = getVoidLogger();

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    jest.resetAllMocks();
    const router = await createRouter({
      logger,
      config: new ConfigReader({
        catalog: {
          providers: {
            kiali: {
              url: 'https://localhost:4000',
              serviceAccountToken: '<token>',
            },
          },
        },
      }),
    });
    app = express();
    app.disable("'x-powered-by");

    app = app.use(router);
  });

  describe('POST /status', () => {
    it('should get the kiali status', async () => {
      const result = await request(app).post('/status');
      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        category: 'versionSupported',
        message:
          'Kiali version supported is v1.86, we found version v1.73.0-SNAPSHOT',
        title: 'kiali version not supported',
        verify: false,
      });
    });
  });

  describe('POST /proxy', () => {
    it('should get namespaces', async () => {
      const result = await request(app)
        .post('/proxy')
        .send('{"endpoint":"api/namespaces"}')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(result.status).toBe(200);
      expect(result.body).toEqual([
        {
          name: 'bookinfo',
          cluster: 'Kubernetes',
          isAmbient: false,
          labels: {
            'istio-injection': 'enabled',
            'kubernetes.io/metadata.name': 'bookinfo',
            'pod-security.kubernetes.io/audit': 'privileged',
            'pod-security.kubernetes.io/audit-version': 'v1.24',
            'pod-security.kubernetes.io/warn': 'privileged',
            'pod-security.kubernetes.io/warn-version': 'v1.24',
          },
          annotations: {
            'openshift.io/description': '',
            'openshift.io/display-name': '',
            'openshift.io/requester': 'kubeadmin',
            'openshift.io/sa.scc.mcs': 's0:c26,c15',
            'openshift.io/sa.scc.supplemental-groups': '1000680000/10000',
            'openshift.io/sa.scc.uid-range': '1000680000/10000',
          },
        },
        {
          name: 'default',
          cluster: 'Kubernetes',
          isAmbient: false,
          labels: {
            'kubernetes.io/metadata.name': 'default',
            'pod-security.kubernetes.io/audit': 'privileged',
            'pod-security.kubernetes.io/enforce': 'privileged',
            'pod-security.kubernetes.io/warn': 'privileged',
          },
          annotations: {
            'openshift.io/sa.scc.mcs': 's0:c1,c0',
            'openshift.io/sa.scc.supplemental-groups': '1000000000/10000',
            'openshift.io/sa.scc.uid-range': '1000000000/10000',
          },
        },
        {
          name: 'hostpath-provisioner',
          cluster: 'Kubernetes',
          isAmbient: false,
          labels: {
            'kubernetes.io/metadata.name': 'hostpath-provisioner',
            'pod-security.kubernetes.io/audit': 'privileged',
            'pod-security.kubernetes.io/audit-version': 'v1.24',
            'pod-security.kubernetes.io/warn': 'privileged',
            'pod-security.kubernetes.io/warn-version': 'v1.24',
          },
          annotations: {
            'kubectl.kubernetes.io/last-applied-configuration':
              '{"apiVersion":"v1","kind":"Namespace","metadata":{"annotations":{},"name":"hostpath-provisioner"}}\n',
            'openshift.io/sa.scc.mcs': 's0:c26,c0',
            'openshift.io/sa.scc.supplemental-groups': '1000650000/10000',
            'openshift.io/sa.scc.uid-range': '1000650000/10000',
          },
        },
        {
          name: 'istio-system',
          cluster: 'Kubernetes',
          isAmbient: false,
          labels: {
            'kubernetes.io/metadata.name': 'istio-system',
            'pod-security.kubernetes.io/audit': 'privileged',
            'pod-security.kubernetes.io/audit-version': 'v1.24',
            'pod-security.kubernetes.io/warn': 'privileged',
            'pod-security.kubernetes.io/warn-version': 'v1.24',
            'topology.istio.io/network': '',
          },
          annotations: {
            'openshift.io/description': '',
            'openshift.io/display-name': '',
            'openshift.io/requester': 'kubeadmin',
            'openshift.io/sa.scc.mcs': 's0:c26,c5',
            'openshift.io/sa.scc.supplemental-groups': '1000660000/10000',
            'openshift.io/sa.scc.uid-range': '1000660000/10000',
          },
        },
        {
          name: 'kiali',
          cluster: 'Kubernetes',
          isAmbient: false,
          labels: {
            'kubernetes.io/metadata.name': 'kiali',
            'pod-security.kubernetes.io/audit': 'restricted',
            'pod-security.kubernetes.io/audit-version': 'v1.24',
            'pod-security.kubernetes.io/warn': 'restricted',
            'pod-security.kubernetes.io/warn-version': 'v1.24',
          },
          annotations: {
            'openshift.io/sa.scc.mcs': 's0:c26,c20',
            'openshift.io/sa.scc.supplemental-groups': '1000690000/10000',
            'openshift.io/sa.scc.uid-range': '1000690000/10000',
          },
        },
      ]);
    });
  });
});
