/*!
 * @license
 * Alfresco Example Content Application
 *
 * Copyright (C) 2005 - 2018 Alfresco Software Limited
 *
 * This file is part of the Alfresco Example Content Application.
 * If the software was purchased under a paid Alfresco license, the terms of
 * the paid license agreement will prevail.  Otherwise, the software is
 * provided under the following open source license terms:
 *
 * The Alfresco Example Content Application is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * The Alfresco Example Content Application is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Alfresco. If not, see <http://www.gnu.org/licenses/>.
 */

import {Effect, Actions, ofType} from '@ngrx/effects';
import {Injectable} from '@angular/core';
import {map, take} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {AppStore} from '../states/app.state';
import {
    PurgeDeletedNodesAction,
    PURGE_DELETED_NODES,
    DeleteNodesAction,
    DELETE_NODES,
    UndoDeleteNodesAction,
    UNDO_DELETE_NODES,
    CreateFolderAction,
    CREATE_FOLDER,
    EditFolderAction,
    EDIT_FOLDER,
    RestoreDeletedNodesAction,
    RESTORE_DELETED_NODES,
    ShareNodeAction,
    SHARE_NODE
} from '../actions';
import {ContentManagementService} from '../../services/content-management.service';
import {BlockchainFactomService} from '../../services/factom/blockchain-factom.service';
import {NotificationService} from '@alfresco/adf-core';
import {currentFolder, appSelection} from '../selectors/app.selectors';
import {
    UnshareNodesAction,
    UNSHARE_NODES,
    CopyNodesAction,
    COPY_NODES,
    MoveNodesAction,
    MOVE_NODES,
    ManagePermissionsAction,
    MANAGE_PERMISSIONS,
    ManageVersionsAction,
    MANAGE_VERSIONS,
    BlockchainSignAction,
    BLOCKCHAIN_SIGN,
    BlockchainVerifyAction,
    BLOCKCHAIN_VERIFY
} from '../actions/node.actions';
import {Observable} from 'rxjs';
import {MatSnackBarConfig} from '@angular/material';

@Injectable()
export class NodeEffects {

    constructor(
        private store: Store<AppStore>,
        private actions$: Actions,
        private contentService: ContentManagementService,
        private blockchainFactomService: BlockchainFactomService,
        private notification: NotificationService,
    ) {
        this.snackBarConfig = new MatSnackBarConfig();
        this.snackBarConfig.duration = 15000;
        this.snackBarConfig.panelClass = 'snackbarBlockchain';
        this.snackBarConfig.politeness = 'assertive';
    }

    private snackBarConfig: MatSnackBarConfig;

    @Effect({dispatch: false})
    shareNode$ = this.actions$.pipe(
        ofType<ShareNodeAction>(SHARE_NODE),
        map(action => {
            if (action.payload) {
                this.contentService.shareNode(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && selection.file) {
                            this.contentService.shareNode(selection.file);
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    unshareNodes$ = this.actions$.pipe(
        ofType<UnshareNodesAction>(UNSHARE_NODES),
        map(action => {
            if (action && action.payload && action.payload.length > 0) {
                this.contentService.unshareNodes(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && !selection.isEmpty) {
                            this.contentService.unshareNodes(selection.nodes);
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    purgeDeletedNodes$ = this.actions$.pipe(
        ofType<PurgeDeletedNodesAction>(PURGE_DELETED_NODES),
        map(action => {
            if (action && action.payload && action.payload.length > 0) {
                this.contentService.purgeDeletedNodes(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && selection.count > 0) {
                            this.contentService.purgeDeletedNodes(
                                selection.nodes
                            );
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    restoreDeletedNodes$ = this.actions$.pipe(
        ofType<RestoreDeletedNodesAction>(RESTORE_DELETED_NODES),
        map(action => {
            if (action && action.payload && action.payload.length > 0) {
                this.contentService.restoreDeletedNodes(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && selection.count > 0) {
                            this.contentService.restoreDeletedNodes(
                                selection.nodes
                            );
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    deleteNodes$ = this.actions$.pipe(
        ofType<DeleteNodesAction>(DELETE_NODES),
        map(action => {
            if (action && action.payload && action.payload.length > 0) {
                this.contentService.deleteNodes(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && selection.count > 0) {
                            this.contentService.deleteNodes(selection.nodes);
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    undoDeleteNodes$ = this.actions$.pipe(
        ofType<UndoDeleteNodesAction>(UNDO_DELETE_NODES),
        map(action => {
            if (action.payload.length > 0) {
                this.contentService.undoDeleteNodes(action.payload);
            }
        })
    );

    @Effect({dispatch: false})
    createFolder$ = this.actions$.pipe(
        ofType<CreateFolderAction>(CREATE_FOLDER),
        map(action => {
            if (action.payload) {
                this.contentService.createFolder(action.payload);
            } else {
                this.store
                    .select(currentFolder)
                    .pipe(take(1))
                    .subscribe(node => {
                        if (node && node.id) {
                            this.contentService.createFolder(node.id);
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    editFolder$ = this.actions$.pipe(
        ofType<EditFolderAction>(EDIT_FOLDER),
        map(action => {
            if (action.payload) {
                this.contentService.editFolder(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && selection.folder) {
                            this.contentService.editFolder(selection.folder);
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    copyNodes$ = this.actions$.pipe(
        ofType<CopyNodesAction>(COPY_NODES),
        map(action => {
            if (action.payload && action.payload.length > 0) {
                this.contentService.copyNodes(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && !selection.isEmpty) {
                            this.contentService.copyNodes(selection.nodes);
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    moveNodes$ = this.actions$.pipe(
        ofType<MoveNodesAction>(MOVE_NODES),
        map(action => {
            if (action.payload && action.payload.length > 0) {
                this.contentService.moveNodes(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && !selection.isEmpty) {
                            this.contentService.moveNodes(selection.nodes);
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    managePermissions = this.actions$.pipe(
        ofType<ManagePermissionsAction>(MANAGE_PERMISSIONS),
        map(action => {
            if (action && action.payload) {
                this.contentService.managePermissions(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && !selection.isEmpty) {
                            this.contentService.managePermissions(
                                selection.first
                            );
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    manageVersions$ = this.actions$.pipe(
        ofType<ManageVersionsAction>(MANAGE_VERSIONS),
        map(action => {
            if (action && action.payload) {
                this.contentService.manageVersions(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && selection.file) {
                            this.contentService.manageVersions(
                                selection.file
                            );
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    blockchainSignNodes$ = this.actions$.pipe(
        ofType<BlockchainSignAction>(BLOCKCHAIN_SIGN),
        map(action => {
            if (action.payload && action.payload.length > 0) {
                this.signNodes(action);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && !selection.isEmpty) {
                            this.signNodes(selection);
                        }
                    });
            }
        })
    );

    @Effect({dispatch: false})
    blockchainVerifyNodes$ = this.actions$.pipe(
        ofType<BlockchainVerifyAction>(BLOCKCHAIN_VERIFY),
        map(action => {
            if (action.payload && action.payload.length > 0) {
                this.verifyNodes(action.payload);
            } else {
                this.store
                    .select(appSelection)
                    .pipe(take(1))
                    .subscribe(selection => {
                        if (selection && !selection.isEmpty) {
                            this.verifyNodes(selection);
                        }
                    });
            }
        })
    );

    private signNodes(selection) {
        const messageBuilder = [];
        Observable.zip(
            this.blockchainFactomService.signSelection(selection.nodes)
        ).subscribe(
            (result) => {
                if (result != null) {
                    result.forEach((message) => {
                        messageBuilder.push(message);
                        messageBuilder.push('\n');
                    });
                }
            },
            (error) => {
                this.toastMessage(error.message);
            }, () => {
                this.toastMessage(messageBuilder.join(''));
            }
        );
    }


    private verifyNodes(selection) {
        const messageBuilder = [];
        Observable.zip(
            this.blockchainFactomService.verifySelection(selection.nodes)
        ).subscribe(
            (result) => {
                if (result != null) {
                    result.forEach((message) => {
                        messageBuilder.push(message);
                        messageBuilder.push('\n');
                    });
                }
            },
            (error) => {
                this.toastMessage(error.message);
            }, () => {
                this.toastMessage(messageBuilder.join(''));
            }
        );
    }

    private toastMessage(message: any) {
        this.notification.openSnackMessageAction(message, '', this.snackBarConfig);
    }
}
