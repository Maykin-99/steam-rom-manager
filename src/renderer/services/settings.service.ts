import { Injectable } from '@angular/core';
import { readJson, writeJson, JsonValidator } from "../../shared/lib";
import { availableProviders } from '../lib/image-providers';
import { AppSettings } from "../models";
import { LoggerService } from './logger.service';
import { Subject, BehaviorSubject } from "rxjs";
import { gApp } from "../app.global";
import * as schemas from '../schemas';
import * as modifiers from '../modifiers';
import * as _ from "lodash";
import * as paths from '../../shared/paths';

@Injectable()
export class SettingsService {
    private changeSubject: Subject<AppSettings> = new Subject();
    private settingsLoadedSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);
    private validator: JsonValidator = new JsonValidator(schemas.appSettings, { controlProperty: 'version', modifierFields: modifiers.appSettings });
    private savingIsDisabled: boolean = false;
    private appSettings: AppSettings;

    constructor(private loggerService: LoggerService) {
        this.appSettings = <AppSettings>this.validator.getDefaultValues();

        readJson<AppSettings>(paths.userSettings, this.appSettings).then((settings) => {
            let errors = this.validator.validate(settings);
            let errorString = errors ? `\r\n${JSON.stringify(errors, null, 4)}` : '';

            if (errorString.length > 0) {
                this.savingIsDisabled = true;
                this.loggerService.error(this.lang.error.readingError, { invokeAlert: true, alertTimeout: 5000, doNotAppendToLog: true });
                this.loggerService.error(this.lang.error.corruptedSettings__i.interpolate({
                    file: paths.userSettings,
                    error: errorString
                }));
            }
            else
                this.appSettings = settings;
        }).catch((error) => {
            this.loggerService.error(this.lang.error.readingError, { invokeAlert: true, alertTimeout: 3000 });
            this.loggerService.error(error);
        }).then(() => {
            this.settingsLoadedSubject.next(true);
        });
    }

    private get lang() {
        return gApp.lang.settings.service;
    }

    getSettings() {
        return this.appSettings;
    }

    settingsChanged() {
        this.changeSubject.next(this.appSettings);
    }

    getChangeObservable() {
        return this.changeSubject.asObservable();
    }

    saveAppSettings() {
        if (!this.savingIsDisabled){
            writeJson(paths.userSettings, this.appSettings).then().catch((error) => {
                this.loggerService.error(this.lang.error.writingError, { invokeAlert: true, alertTimeout: 3000 });
                this.loggerService.error(error);
            });
        }
    }

    onLoad(callback: (appSettings: AppSettings) => void) {
        this.settingsLoadedSubject.asObservable().takeWhile((loaded) => {
            if (loaded)
                callback(this.appSettings);

            return !loaded;
        }).subscribe();
    }
}