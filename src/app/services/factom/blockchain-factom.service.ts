import {Injectable} from '@angular/core';
import {AlfrescoApiService, ContentService, NotificationService, TranslationService} from '@alfresco/adf-core';
import {MinimalNodeEntity, MinimalNodeEntryEntity} from 'alfresco-js-api';
import {HttpClient} from '@angular/common/http';
import {observable} from 'rxjs/symbol/observable';
import {AlfrescoApi, ContentApi} from 'alfresco-js-api';
import * as shajs from 'sha.js';
import {Subject} from 'rxjs/Rx';
import {Buffer} from 'buffer';
import {secrets} from '../../../environments/secrets';
import {sprintf} from 'sprintf-js';
import {FactomCli, Entry, Chain} from 'factom';
import {logging} from 'selenium-webdriver';
import {ApiClientConfiguration} from '../blockchain-proof/sdk';


@Injectable()
export class BlockchainFactomService {


    constructor(private contentService: ContentService,
                private notification: NotificationService,
                private translation: TranslationService,
                private http: HttpClient) {

        this.contentService = contentService;
        this.factomCli = new FactomCli({
            factomd: {
                host: 'localhost',
                port: '4200',
                path: '/factomd/v2'
            },
            walletd: {
                host: 'localhost',
                port: '4200',
                path: '/walletd/v2'
            },
            protocol: 'http',
            rejectUnauthorized: false
        });
    }

    private factomCli: FactomCli;

    private;


    signSelection(contentEntities: Array<MinimalNodeEntity>): Subject<string> {
        const observable: Subject<string> = new Subject<string>();

        if (!this.isEntryEntitiesArray(contentEntities)) {
            observable.error(new Error(JSON.stringify({error: {statusCode: 400}})));
        } else {
            const atomicItemCounter: AtomicItemCounter = new AtomicItemCounter();
            contentEntities.forEach(entity => {
                if (entity.entry.isFile) {
                    atomicItemCounter.incrementCount();
                    this.signEntry(entity, atomicItemCounter, observable);
                }
            });
        }

        return observable;
    }


    private async signEntry(entity, atomicItemCounter: AtomicItemCounter, observable: Subject<string>) {
        console.log('Signing entry ' + entity.entry.id);
        this.contentService.getNodeContent(entity.entry.id).subscribe(value => {

            const hash = shajs('sha256').update(Buffer.from(value)).digest('hex');

            const firstEntry = Entry.builder()
                .extId('Hash')
                .extId(hash)
                .content(hash, 'utf8')
                .build();

            const chain = new Chain(firstEntry);
            const addResponse = this.factomCli.add(chain, secrets.entryCreditAddress)
                .catch(function (e) {
                    const userMessage = sprintf(this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.PROCESS_FAILED'),
                        this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.REGISTRATION'), entity.entry.name);
                    this.handleApiError(e, userMessage, observable);
                });

            addResponse.then(response => {
                const messageBuilder = [];
                messageBuilder.push(sprintf(this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.REGISTRATION_STARTED'), entity.entry.name));
                messageBuilder.push('.');
                const message = messageBuilder.join('');
                console.log(message);
                console.log('Calculated hash: ' + hash);
                console.log('Per hash proof chain id: ' + response.chainId);
                console.log('Per hash proof entryHash: ' + response.entryHash);
                observable.next(message);
                atomicItemCounter.incrementIndex();
                if (atomicItemCounter.isLast()) {
                    observable.complete();
                }
            });
        });
    }


    verifySelection(contentEntities: Array<MinimalNodeEntity>): Subject<string> {
        const observable: Subject<string> = new Subject<string>();

        if (!this.isEntryEntitiesArray(contentEntities)) {
            observable.error(new Error(JSON.stringify({error: {statusCode: 400}})));
        } else {
            const atomicItemCounter: AtomicItemCounter = new AtomicItemCounter();
            contentEntities.forEach(entity => {
                if (entity.entry.isFile) {
                    atomicItemCounter.incrementCount();
                    this.verifyEntry(entity, atomicItemCounter, observable);
                }
            });
        }

        return observable;
    }


    private verifyEntry(entity, atomicItemCounter: AtomicItemCounter, observable: Subject<string>) {
        console.log('Verifying entry ' + entity.entry.id);
        this.contentService.getNodeContent(entity.entry.id).subscribe(value => {

            const hash = shajs('sha256').update(Buffer.from(value)).digest('hex');

            const firstEntry = Entry.builder()
                .extId('Hash')
                .extId(hash)
                .content(hash, 'utf8')
                .build();

            const chain = new Chain(firstEntry);
            const revealResponse = this.factomCli.revealChain(chain, 0)
                .catch(function (e) {
                    const userMessage = sprintf(this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.PROCESS_FAILED'),
                        this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.VERIFICATION'), entity.entry.name);
                    this.handleApiError(e, userMessage, observable);
                });
            revealResponse.then(response => {
                this.factomCli.getFirstEntry(response.chainId)
                    .then(firstEntryResponse => {
                        const message = this.buildVerifyResponseMessage(entity.entry, response, firstEntryResponse);
                        console.log(message);
                        console.log('Calculated hash: ' + response.hash);
                        console.log('Per hash proof chain id: ' + response.chainId);
                        console.log('Per hash proof entryHash: ' + response.entryHash);
                        observable.next(message);
                        atomicItemCounter.incrementIndex();
                        if (atomicItemCounter.isLast()) {
                            observable.complete();
                        }
                    });
            });
        });
    }


    private buildVerifyResponseMessage(entry, chainResponse, entryResponse) {
        const messageBuilder = [];

        const registrationState = entryResponse != null ? 'REGISTERED' : 'NOT_REGISTERED';
        const registrationTime = entryResponse != null ? new Date(entryResponse.timestamp) : null;

        if (registrationTime != null) {
            messageBuilder.push(sprintf(this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.FILE_WAS'), entry.name));
            messageBuilder.push(' ');
            messageBuilder.push(this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.REGISTERED_ON'));
            messageBuilder.push(' ');
            messageBuilder.push(registrationTime);
        }
/*
        else if (registrationState === 'PENDING') {
            messageBuilder.push(sprintf(this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.FILE_IS'), entry.name));
            messageBuilder.push(' ');
            messageBuilder.push(this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.PENDING'));
        }
*/
        else {
            messageBuilder.push(sprintf(this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.FILE_IS'), entry.name));
            messageBuilder.push(' ');
            messageBuilder.push(this.translate('APP.MESSAGES.INFO.BLOCKCHAIN.NOT_REGISTERED'));
        }
        messageBuilder.push('.');
        const message = messageBuilder.join('');
        return message;
    }


    private translate(key: string) {
        return this.translation.instant(key);
    }

    private handleApiError(error, userMessage, observable: Subject<string>) {
        const logMessageBuilder = [];
        logMessageBuilder.push(error.message);
        if (error.error && error.error.errors) {
            error.error.errors.forEach(errorItem => {
                const errorMessage = JSON.stringify(errorItem);
                console.log(errorMessage);
                if (logMessageBuilder.length > 0) {
                    logMessageBuilder.push('\n');
                }
                logMessageBuilder.push(errorMessage);
            });
        }
        console.log(logMessageBuilder.join(''));

        observable.error(new Error(userMessage));
    }

    apiConfig() {
        const config = new ApiClientConfiguration();
        config.accessToken = secrets.bcproofFixedToken;
        return config;
    }

    isEntryEntitiesArray(contentEntities: any[]): boolean {
        if (contentEntities && contentEntities.length) {
            const nonEntryNode = contentEntities.find(node => (!node || !node.entry || !(node.entry.nodeId || node.entry.id)));
            return !nonEntryNode;
        }
        return false;
    }

}

class AtomicItemCounter {

    private count: number = 0;
    private index: number = 0;

    incrementCount() {
        this.count++;
    }

    incrementIndex() {
        this.index++;
    }

    isLast(): boolean {
        return this.index >= this.count;
    }
}
