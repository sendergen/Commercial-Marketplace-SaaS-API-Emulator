import { Express, RequestHandler } from 'express';
import { generateSampleSubscription } from './helpers/subscription-helper';
import { generateSampleOffer } from './helpers/offer-helper';
import { ServicesContainer } from './services/container';
import { Config, Offer, CspPartner, Customer } from './types';

// High-order function to inject ServiceContainer into api handlers
const configure: (app: Express, services: ServicesContainer) => void = (app, services) => {
  //
  // Get sample subscription
  //
  app.get('/api/util/subscription', (async (req, res) => {
    const subscription = generateSampleSubscription();

    res.send(subscription);
  }) as RequestHandler);

  //
  // Get all publishers
  //
  app.get('/api/util/publishers/:pid/subscriptions/:sid', (async (req, res) => {
    const publishers = await services.stateStore.getSubscriptionAsync(req.params.pid, req.params.sid);

    res.send(publishers);
  }) as RequestHandler);
  
  //
  // Get all publishers
  //
  app.delete('/api/util/publishers/:pid/subscriptions/:sid', (async (req, res) => {
    const success = await services.stateStore.deleteSubscriptionAsync(req.params.pid, req.params.sid);
    res.sendStatus(success ? 204 : 404);
  }) as RequestHandler);

  //
  // Get sample offer
  //
  app.get('/api/util/offer', (async (req, res) => {
    const offer = generateSampleOffer('SampleOffer', 'Sample Offer', false, true);

    res.send(offer);
  }) as RequestHandler);

  //
  // Get all offers
  //
  app.get('/api/util/offers', (async (req, res) => {
    res.send(services.stateStore.getAllOffers());
  }) as RequestHandler);
  
  //
  // Get single offer
  //
  app.get('/api/util/offers/:offerId', (async (req, res) => {
    res.send(services.stateStore.getOffer(req.params.offerId));
  }) as RequestHandler);

  //
  // Upsert offer
  //
  app.post('/api/util/offers', (async (req, res) => {
    const offer = req.body as Partial<Offer>;
    const newOffer = await services.stateStore.upsertOfferAsync(offer);
    
    if (newOffer === undefined) {
      res.sendStatus(404);
    }
    else {
      res.send(newOffer);
    }

  }) as RequestHandler);

  //
  // Delete offer
  //
  app.delete('/api/util/offers/:offerId', (async (req, res) => {
    const success = await services.stateStore.deleteOfferAsync(req.params.offerId);
    res.sendStatus(success ? 204 : 400);
  }) as RequestHandler);

  //
  // Get all publishers
  //
  app.get('/api/util/publishers', (async (req, res) => {
    const publishers = await services.stateStore.getPublishersAsync();

    res.send(publishers);
  }) as RequestHandler);

  //
  // Get config
  //
  app.get('/api/util/config', (async (req, res) => {
    const config = JSON.parse(JSON.stringify(services.config)) as Config;
    delete config.webhook.clientSecret;
    delete config.internal;
    res.status(200).send(config);
  }) as RequestHandler);

  //
  // Update config
  //
  app.patch('/api/util/config', (async (req, res) => {
    for (const i in req.body) {
      if (Object.prototype.hasOwnProperty.call(services.config, i)) {
        // If it's the webhookUrl/landingPageUrl being set, a relative path wont work
        if (i === 'webhookUrl' || i === 'landingPageUrl') {
          const url = req.body[i] as string;
          if (!url.startsWith('http')) {
            res.status(400).send('URLs must be a fully qualified.');
            return;
          }
        }
        
        if (i === "requireAuth") {
          (services.config as any)[i] = req.body[i] === true;
        }
        else {
          (services.config as any)[i] = req.body[i];
        }
      }
    }
    res.sendStatus(200);
  }) as RequestHandler);


  app.delete('/api/util/data-file', (async (req, res) => {
    await services.stateStore.clearState();
    res.sendStatus(204);
  }) as RequestHandler);

  //
  // CSP Partners - Get all
  //
  app.get('/api/util/csp-partners', (async (req, res) => {
    const partners = services.configFiles.getCspPartners();
    res.status(200).send(partners);
  }) as RequestHandler);

  //
  // CSP Partners - Add/Update
  //
  app.post('/api/util/csp-partners', (async (req, res) => {
    const partner = req.body as CspPartner;
    if (!partner.id || !partner.name || !partner.email) {
      res.status(400).send({ error: 'Partner must have id, name, and email' });
      return;
    }

    const partners = services.configFiles.getCspPartners();
    const existingIndex = partners.findIndex(p => p.id === partner.id);

    if (existingIndex >= 0) {
      partners[existingIndex] = partner;
    } else {
      partners.push(partner);
    }

    await services.configFiles.saveCspPartners(partners);
    services.config.cspPartners = partners;
    res.status(200).send(partner);
  }) as RequestHandler);

  //
  // CSP Partners - Delete
  //
  app.delete('/api/util/csp-partners/:id', (async (req, res) => {
    const partners = services.configFiles.getCspPartners();
    const filteredPartners = partners.filter(p => p.id !== req.params.id);

    if (filteredPartners.length === partners.length) {
      res.sendStatus(404);
      return;
    }

    await services.configFiles.saveCspPartners(filteredPartners);
    services.config.cspPartners = filteredPartners;
    res.sendStatus(204);
  }) as RequestHandler);

  //
  // Customers - Get all
  //
  app.get('/api/util/customers', (async (req, res) => {
    const customers = services.configFiles.getCustomers();
    res.status(200).send(customers);
  }) as RequestHandler);

  //
  // Customers - Add/Update
  //
  app.post('/api/util/customers', (async (req, res) => {
    const customer = req.body as Customer;
    if (!customer.id || !customer.name || !customer.emailId) {
      res.status(400).send({ error: 'Customer must have id, name, and emailId' });
      return;
    }

    const customers = services.configFiles.getCustomers();
    const existingIndex = customers.findIndex(c => c.id === customer.id);

    if (existingIndex >= 0) {
      customers[existingIndex] = customer;
    } else {
      customers.push(customer);
    }

    await services.configFiles.saveCustomers(customers);
    services.config.customers = customers;
    res.status(200).send(customer);
  }) as RequestHandler);

  //
  // Customers - Delete
  //
  app.delete('/api/util/customers/:id', (async (req, res) => {
    const customers = services.configFiles.getCustomers();
    const filteredCustomers = customers.filter(c => c.id !== req.params.id);

    if (filteredCustomers.length === customers.length) {
      res.sendStatus(404);
      return;
    }

    await services.configFiles.saveCustomers(filteredCustomers);
    services.config.customers = filteredCustomers;
    res.sendStatus(204);
  }) as RequestHandler);
};

export default configure;
