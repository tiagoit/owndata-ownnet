/* eslint-disable @typescript-eslint/no-unused-vars */
import { strict as assert } from 'assert';
import axios from 'axios';

import feathers from '@feathersjs/feathers';
import { Service } from 'feathers-memory';

import * as express from '@feathersjs/express';
import { realtimeWrapper } from '../src';

const expressify = express.default;
const { rest } = express;

let desc = 'RealtimeWrapper REST support';
let wrapperFn = realtimeWrapper;
let serviceName = "code";
let port = 7886;


describe(desc, () => {
  let server;
  let app;

  beforeEach(() => {
    app = expressify(feathers())
      .configure(rest(rest.formatter))
      .use(express.json())
      .use(serviceName, {
        async get(id) {
          return Promise.resolve({ id, get: 'ok' });
        },

        async create(data) {
          let myData = JSON.parse(JSON.stringify(data));
          myData.create = 'ok';
          return Promise.resolve(myData);
        }
      });

    server = app.listen(port, () => app.use('tasks', new Service()));
  });

  afterEach(done => server.close(done));


  it('can call service', async () => {
    wrapperFn(app, serviceName, {});
    let result = null;
    try {
      result = await axios({ // Call 'create'
        method: 'post',
        url: `http://localhost:${port}/${serviceName}`,
        data: {
          firstName: 'Fred',
          lastName: 'Flintstone'
        }
      });
    } catch (error) {
      assert.fail(`Should never get here: errName=${error.name}, errMessage=${error.message}`);
    };

    assert.deepStrictEqual(result.data, { firstName: 'Fred', lastName: 'Flintstone', create: 'ok' });
  });

  it('activates wrapped services hooks', async () => {
    app.service(serviceName).hooks({
      after: {
        all: [async context => {
          context.result.fromHook = 'You were here!';
          return context;
        }
        ]
      }
    });
    wrapperFn(app, serviceName, {});

    let result = null;
    try {
      result = await axios({ // Call 'create'
        method: 'post',
        url: `http://localhost:${port}/${serviceName}`,
        data: {
          firstName: 'Fred',
          lastName: 'Flintstone'
        }
      });
    } catch (error) {
      assert.fail(`Should never get here: errName=${error.name}, errMessage=${error.message}`);
    };

    assert.deepStrictEqual(result.data, { create: 'ok', firstName: 'Fred', fromHook: 'You were here!', lastName: 'Flintstone' });
  });

  it('wrapped service triggers event handlers', async () => {
    let flag = false;
    app.service(serviceName).on('created', () => { flag = true; });
    wrapperFn(app, serviceName, {});

    let result = null;
    try {
      result = await axios({ // Call 'create'
        method: 'post',
        url: `http://localhost:${port}/${serviceName}`,
        data: {
          firstName: 'Fred',
          lastName: 'Flintstone'
        }
      });
    } catch (error) {
      assert.fail(`Should never get here: errName=${error.name}, errMessage=${error.message}`);
    };

    assert.deepStrictEqual(result.data, { firstName: 'Fred', lastName: 'Flintstone', create: 'ok' });
    assert.deepStrictEqual(flag, true);
  });
});
