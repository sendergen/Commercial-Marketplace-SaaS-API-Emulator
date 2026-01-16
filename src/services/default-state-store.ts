import * as path from 'path';
import * as fs from 'fs/promises';
import {
  Subscription,
  Operation,
  Publishers,
  PublisherSubscriptions,
  SubscriptionAndOperations,
  Config,
  Offers,
  DataVersion,
  StateStore,
  Offer,
  Plan
} from '../types';
import { generateSampleOffer } from '../helpers/offer-helper';
import { DEFAULT_OPENSENSE_OFFERS } from '../helpers/default-offers';
import { Logger } from './logger';

export default class DefaultStateStore implements StateStore {
  publishers: Publishers = {};
  offers: Offers = {};
  config: Config;
  logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  private async checkDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!((await fs.stat(dir).catch((_) => false)) as boolean)) {
      await fs.mkdir(dir);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    await this.checkDir(filePath);
    return (await fs.stat(filePath).catch((_) => false)) as boolean;
  }

  private async loadSubscriptionsFile(fileLocation: string): Promise<void> {
    const filePath = path.resolve(fileLocation, 'subscriptions.json');

    if (!(await this.fileExists(filePath))) {
      this.logger.log("subscriptions.json doesn't exist - starting with empty subscriptions", 'StateStore');
      return;
    }

    if (this.config.run.skipDataLoad === true) {
      this.logger.log('SKIP DATA LOAD == true - skipping subscriptions load', 'StateStore');
      return;
    }

    try {
      const buffer = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(buffer);

      if (data?.version !== DataVersion) {
        this.logger.log("Subscriptions version doesn't match - archiving file", 'StateStore');
        const archivedPath = path.resolve(
          path.dirname(filePath),
          `subscriptions_${(data.version as string) ?? 'missing_version'}.json`
        );
        try {
          await fs.copyFile(filePath, archivedPath);
          await fs.rm(filePath);
        } catch (e) {
          this.logger.log(`Unable to archive subscriptions file - ${e as string}`, 'StateStore');
        }
        return;
      }

      if (data?.publishers !== undefined) {
        this.publishers = data.publishers;
        this.logger.log(`Loaded subscriptions for ${Object.keys(this.publishers).length} publisher(s)`, 'StateStore');
      }
    } catch (e) {
      this.logger.log(`Error loading subscriptions.json: ${e as string}`, 'StateStore');
    }
  }

  private async loadOffersFile(fileLocation: string): Promise<void> {
    const filePath = path.resolve(fileLocation, 'offers.json');

    if (!(await this.fileExists(filePath))) {
      this.logger.log("offers.json doesn't exist - using sample offers only", 'StateStore');
      return;
    }

    if (this.config.run.skipDataLoad === true) {
      this.logger.log('SKIP DATA LOAD == true - skipping offers load', 'StateStore');
      return;
    }

    try {
      const buffer = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(buffer);

      if (data?.version !== DataVersion) {
        this.logger.log("Offers version doesn't match - archiving file", 'StateStore');
        const archivedPath = path.resolve(
          path.dirname(filePath),
          `offers_${(data.version as string) ?? 'missing_version'}.json`
        );
        try {
          await fs.copyFile(filePath, archivedPath);
          await fs.rm(filePath);
        } catch (e) {
          this.logger.log(`Unable to archive offers file - ${e as string}`, 'StateStore');
        }
        return;
      }

      if (data?.offers !== undefined) {
        this.offers = { ...this.offers, ...data.offers };
        this.logger.log(`Loaded ${Object.keys(data.offers).length} offer(s) from file`, 'StateStore');
      }
    } catch (e) {
      this.logger.log(`Error loading offers.json: ${e as string}`, 'StateStore');
    }
  }

  async load(): Promise<void> {
    this.offers = {};
    this.publishers = {};

    if (!this.config.noSamples) {
      const sampleOffer1: Offer = generateSampleOffer('flat-rate', 'Sample Flat Rate', false, false);
      const sampleOffer2: Offer = generateSampleOffer('per-seat', 'Sample Per Seat', true, false);
      this.offers[sampleOffer1.offerId] = sampleOffer1;
      this.offers[sampleOffer2.offerId] = sampleOffer2;

      // Add Opensense offers as defaults
      for (const offer of DEFAULT_OPENSENSE_OFFERS) {
        this.offers[offer.offerId] = offer;
      }
    }

    if (this.config.fileLocation === undefined) {
      this.logger.log('Missing file location from config - skipping data load', 'StateStore');
      return;
    }

    await this.loadSubscriptionsFile(this.config.fileLocation);
    await this.loadOffersFile(this.config.fileLocation);
  }

  private async saveSubscriptions(): Promise<void> {
    if (this.config.fileLocation === undefined) {
      this.logger.log('Missing file location from config - skipping subscriptions save', 'StateStore');
      return;
    }

    const filePath = path.resolve(this.config.fileLocation, 'subscriptions.json');
    await this.checkDir(filePath);

    const data = JSON.stringify({
      version: DataVersion,
      publishers: this.publishers
    }, null, 2);

    try {
      await fs.writeFile(filePath, data, { encoding: 'utf8' });
    } catch (e) {
      this.logger.log(`Failed to save subscriptions - ${e as string}`, 'StateStore');
    }
  }

  private async saveOffers(): Promise<void> {
    if (this.config.fileLocation === undefined) {
      this.logger.log('Missing file location from config - skipping offers save', 'StateStore');
      return;
    }

    const filePath = path.resolve(this.config.fileLocation, 'offers.json');
    await this.checkDir(filePath);

    // Do not save offers marked as persist=false
    const persistOffers: Offers = {};
    Object.values(this.offers).forEach((obj) => {
      if (obj.persist) {
        persistOffers[obj.offerId] = obj;
      }
    });

    const data = JSON.stringify({
      version: DataVersion,
      offers: persistOffers
    }, null, 2);

    try {
      await fs.writeFile(filePath, data, { encoding: 'utf8' });
    } catch (e) {
      this.logger.log(`Failed to save offers - ${e as string}`, 'StateStore');
    }
  }

  async save(): Promise<void> {
    await this.saveSubscriptions();
    await this.saveOffers();
  }

  async clearState(): Promise<void> {
    if (this.config.fileLocation === undefined) {
      this.logger.log('Missing file location from config - skipping data clear', 'StateStore');
      return;
    }

    // Clear subscriptions file
    const subscriptionsPath = path.resolve(this.config.fileLocation, 'subscriptions.json');
    await this.checkDir(subscriptionsPath);
    await fs.writeFile(subscriptionsPath, JSON.stringify({ version: DataVersion, publishers: {} }, null, 2), { encoding: 'utf8' });

    // Clear offers file
    const offersPath = path.resolve(this.config.fileLocation, 'offers.json');
    await this.checkDir(offersPath);
    await fs.writeFile(offersPath, JSON.stringify({ version: DataVersion, offers: {} }, null, 2), { encoding: 'utf8' });

    await this.load();
  }

  private getOrCreatePublisher(publisherId: string): PublisherSubscriptions {
    return this.publishers[publisherId] ?? (this.publishers[publisherId] = {});
  }

  private getPublisherSubscription(publisherId: string, subscriptionId: string): SubscriptionAndOperations | undefined {
    const publisherSubscriptions = this.publishers[publisherId];

    return publisherSubscriptions !== undefined ? publisherSubscriptions[subscriptionId] : undefined;
  }

  async getPublishersAsync(): Promise<Publishers> {
    return this.publishers;
  }

  async addSubscriptionAsync(publisherId: string, subscription: Subscription): Promise<void> {
    const publisherSubscriptions = this.getOrCreatePublisher(publisherId);

    publisherSubscriptions[subscription.id] = {
      subscription,
      operations: {}
    };

    await this.saveSubscriptions();
  }

  async updateSubscriptionAsync(publisherId: string, subscription: Subscription): Promise<boolean> {
    const publisherSubscriptions = this.getOrCreatePublisher(publisherId);

    const publisherSubscription = publisherSubscriptions[subscription.id];

    if (publisherSubscription === undefined) {
      return false;
    }

    publisherSubscription.subscription = subscription;

    await this.saveSubscriptions();

    return true;
  }

  async getSubscriptionsForPublisherAsync(publisherId: string): Promise<Subscription[] | undefined> {
    const publisherSubscriptions = this.publishers[publisherId];

    return publisherSubscriptions !== undefined
      ? Object.values(publisherSubscriptions).map((x) => x.subscription)
      : undefined;
  }

  async getSubscriptionAsync(publisherId: string, subscriptionId: string): Promise<Subscription | undefined> {
    return this.getPublisherSubscription(publisherId, subscriptionId)?.subscription;
  }

  async deleteSubscriptionAsync(publisherId: string, subscriptionId: string): Promise<boolean> {
    try {
      delete this.publishers[publisherId][subscriptionId];
      await this.saveSubscriptions();
      return true;
    }
    catch {
      return false;
    }
  }

  async findSubscriptionAsync(subscriptionId: string): Promise<Subscription | undefined> {
    const subscription = Object.values(this.publishers).filter((x) =>
      Object.prototype.hasOwnProperty.call(x, subscriptionId)
    );
    return subscription.length > 0 ? subscription[0][subscriptionId].subscription : undefined;
  }

  async addOperationAsync(publisherId: string, subscriptionId: string, operation: Operation): Promise<void> {
    const operations = this.getPublisherSubscription(publisherId, subscriptionId)?.operations;

    if (operations !== undefined) {
      operations[operation.id] = operation;
    }

    await this.saveSubscriptions();
  }

  async getOperationAsync(
    publisherId: string,
    subscriptionId: string,
    operationId: string
  ): Promise<Operation | undefined> {
    return this.getPublisherSubscription(publisherId, subscriptionId)?.operations[operationId];
  }

  async getOperationsAsync(publisherId: string, subscriptionId: string): Promise<Operation[] | undefined> {
    const operations = this.getPublisherSubscription(publisherId, subscriptionId)?.operations;

    return operations !== undefined ? Object.values(operations) : undefined;
  }

  async getPlansForOfferAsync(offerId: string, planId?: string): Promise<Plan[] | undefined> {

    const plans = this.offers[offerId]?.plans !== undefined ? Object.values(this.offers[offerId].plans) : undefined;

    if (planId === undefined || plans === undefined) {
      return plans;
    }

    return plans.filter(x => x.planId === planId);
  }

  async upsertOfferAsync(offer: Partial<Offer>) : Promise<Offer | undefined> {

    const newOffer : Offer = {
      displayName: "Sample Offer",
      offerId: "sampleOfferId",
      publisher: "ForthCoffee",
      persist: true,
      builtIn: false,
      plans: {},

      // Overwrite offer properties from request
      ...offer
    }

    // Check to see if any subscriptions associated with this offer still have their plans in tact
    for (const pub in this.publishers) {
      for (const sub in this.publishers[pub]) {
        const subscription = this.publishers[pub][sub];
        if (subscription.subscription.offerId === offer.offerId) {

          if (!Object.prototype.hasOwnProperty.call(offer.plans, subscription.subscription.planId)) {
            return undefined;
          }

        }
      }
    }

    this.offers[newOffer.offerId] = newOffer;
    await this.saveOffers();
    return newOffer;
  }

  async deleteOfferAsync(offerId: string) : Promise<boolean> {
    if (!Object.prototype.hasOwnProperty.call(this.offers, offerId)) {
      return false;
    }

    // Check to see if the offer is associated with any subscriptions
    for (const pub in this.publishers) {
      for (const sub in this.publishers[pub]) {
        const subscription = this.publishers[pub][sub];
        if (subscription.subscription.offerId === offerId) {
          return false;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.offers[offerId];
    await this.saveOffers();
    return true;
  }

  getAllOffers() : Record<string, Offer> {
    return this.offers;
  }

  getOffer(offerId: string) : Offer | undefined {
    if (!Object.prototype.hasOwnProperty.call(this.offers, offerId)) {
      return undefined;
    }

    return this.offers[offerId];
  }
}
