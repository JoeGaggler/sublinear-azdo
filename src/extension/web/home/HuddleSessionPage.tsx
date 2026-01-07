import * as SDK from 'azure-devops-extension-sdk';

import * as Azdo from '../api/azdo.ts';
import * as Db from '../api/db.ts';
import * as Util from '../api/util.ts';
import type { AppNav } from './app.tsx';

import React from 'react'

// import { Card } from "azure-devops-ui/Card";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
// import { Button } from "azure-devops-ui/Button";
import { SingleLayerMasterPanel } from "azure-devops-ui/MasterDetails";
// import { SingleLayerMasterPanelHeader } from "azure-devops-ui/Components/SingleLayerMasterPanel/SingleLayerMasterPanel";
import { ScrollableList, ListSelection, ListItem, type IListItemDetails, type IListRow } from "azure-devops-ui/List";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";
import { Icon, IconSize, type IIconProps } from 'azure-devops-ui/Icon';
import { Pill, PillVariant } from "azure-devops-ui/Pill";
import { PillGroup, PillGroupOverflow } from "azure-devops-ui/PillGroup";
import { Card } from "azure-devops-ui/Card";
import type { IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar';
import { type IWorkItemFormNavigationService } from "azure-devops-extension-api/WorkItemTracking";
import type { IColor } from 'azure-devops-extension-api';


interface HuddleGraph {
    debugWorkItems: Db.WorkItemSnapshot[]
    slides: HuddleSlide[]
}

interface HuddleSlide {
    type: string
    id: number
    title: string
    fieldChanges: HuddleSlideFieldChange[]
    workItemType: string
    pills: HuddleSlidePill[]
}

interface HuddleSlidePill {
    text: string
    color?: IColor
    message?: string
}

interface HuddleSlideFieldChange {
    what: string
    prev: string
    next: string
}

interface ReducerState {
    title: string,
    created?: number
    availableWorkItemTypes: Azdo.WorkItemType[]
    selectedSlide: number | null,
    huddleGraph?: HuddleGraph
}

interface ReducerAction {
    title?: string
    created?: number
    availableWorkItemTypes?: Azdo.WorkItemType[]
    selectedSlide?: number | null
    snapShot1?: Db.HuddleSessionSnapshot
    snapShot2?: Db.HuddleSessionSnapshot
}

function reducer(state: ReducerState, action: ReducerAction): ReducerState {
    let next = {
        ...state
    }

    if (action.title !== undefined) { next.title = action.title }
    if (action.created !== undefined) { next.created = action.created }
    if (action.availableWorkItemTypes !== undefined) { next.availableWorkItemTypes = action.availableWorkItemTypes }
    if (action.selectedSlide !== undefined) { next.selectedSlide = action.selectedSlide }
    // if (action.huddleGraph !== undefined) { next.huddleGraph = action.huddleGraph }
    if (action.snapShot1 !== undefined && action.snapShot2 !== undefined) {
        next.huddleGraph = reducerHuddleGraph(action.snapShot1, action.snapShot2, next.created)
    }

    console.log("REDUCER2", state, next)
    return next
}

function reducerHuddleGraph(snapShot1: Db.HuddleSessionSnapshot, snapShot2: Db.HuddleSessionSnapshot, created?: number): HuddleGraph {
    let workItems1 = snapShot1.workitems?.items || []
    let workItems2 = snapShot2.workitems?.items || []

    let slides: HuddleSlide[] = []
    for (let wi2 of workItems2) {
        // NEW
        let wi1 = workItems1.find(w => w.id === wi2.id)
        if (!wi1) {
            let nextSlide = {
                type: "new",
                id: wi2.id,
                title: wi2.title,
                fieldChanges: [],
                workItemType: wi2.workItemType || "unknown", // TODO: filter out?
                pills: createPillsList(wi2, created),
            }
            slides.push(nextSlide)
            continue;
        }

        // MATCHED
        let nextSlide = createFoundSlide(wi1, wi2, created);
        slides.push(nextSlide)
    }

    // TODO: slides only in previous
    for (let wi1 of workItems1) {
        let wi2 = workItems2.find(w => w.id !== wi1.id);
        if (wi2) {
            // already handled above
            continue;
        }

        // OLD
        let nextSlide = createFinalSlide(wi1, created);
        slides.push(nextSlide)
    }

    console.log("debug", snapShot2.workitems?.items)
    return {
        debugWorkItems: workItems1,
        slides: slides,
    }
}

function createFoundSlide(wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot, created?: number): HuddleSlide {
    let fieldChanges: HuddleSlideFieldChange[] = []
    if (wi1.title !== wi2.title) { fieldChanges.push({ what: "Title", prev: wi1.title, next: wi2.title }) }
    if (wi1.state !== wi2.state) { fieldChanges.push({ what: "State", prev: wi1.state || "", next: wi2.state || "" }) }
    if (wi1.areaPath !== wi2.areaPath) { fieldChanges.push({ what: "Area", prev: wi1.areaPath || "", next: wi2.areaPath || "" }) }
    if (wi1.iterationPath !== wi2.iterationPath) { fieldChanges.push({ what: "Iteration", prev: wi1.iterationPath || "", next: wi2.iterationPath || "" }) }
    if (wi1.description !== wi2.description) { fieldChanges.push({ what: "Description", prev: wi1.description || "", next: wi2.description || "" }) }
    if (wi1.workItemType !== wi2.workItemType) { fieldChanges.push({ what: "Type", prev: wi1.workItemType || "", next: wi2.workItemType || "" }) }
    if (wi1.tags !== wi2.tags) { fieldChanges.push({ what: "Tags", prev: wi1.tags || "", next: wi2.tags || "" }) }
    if (wi1.backlogPriority !== wi2.backlogPriority) { fieldChanges.push(getSomeFieldChange("Backlog Priority", w => w.backlogPriority, wi1, wi2)) }
    if (wi1.reason !== wi2.reason) { fieldChanges.push(getSomeFieldChange("Reason", w => w.reason, wi1, wi2)) }
    if (wi1.startDate !== wi2.startDate) { fieldChanges.push(getSomeFieldChange("Start Date", w => w.startDate, wi1, wi2)) }
    if (wi1.targetDate !== wi2.targetDate) { fieldChanges.push(getSomeFieldChange("Target Date", w => w.targetDate, wi1, wi2)) }
    if (wi1.parent !== wi2.parent) { { fieldChanges.push(getParentFieldChange(wi1, wi2)) } }
    if ((wi1.comments?.length || -1) !== (wi2.comments?.length || -1)) { { fieldChanges.push(getCommentFieldChange(wi1, wi2)) } }
    // TODO: work item type changes

    // TODO: priority should be based on position of snapshot in huddle session, not the raw value

    if (fieldChanges.length > 0) {
        return ({
            type: "update",
            id: wi2.id,
            title: wi2.title,
            fieldChanges: fieldChanges,
            workItemType: wi2.workItemType || "unknown",
            pills: createPillsList(wi2, created),
        })
    } else {
        return ({
            type: "same",
            id: wi2.id,
            title: wi2.title,
            fieldChanges: [],
            workItemType: wi2.workItemType || "unknown",
            pills: createPillsList(wi2, created)
        })
    }
}

function createFinalSlide(wi1: Db.WorkItemSnapshot, created?: number): HuddleSlide {
    // TODO: has changes or not)
    return ({
        type: "final",
        id: wi1.id,
        title: wi1.title,
        fieldChanges: [],
        workItemType: wi1.workItemType || "unknown",
        pills: createPillsList(wi1, created)
    })
}

function createPillsList(wi: Db.WorkItemSnapshot, created?: number): HuddleSlidePill[] {
    let pills: HuddleSlidePill[] = []
    if (wi.targetDate && created) {
        let targetDateMsec = Util.msecFromISO(wi.targetDate)
        if (targetDateMsec) {
            if (created >= targetDateMsec) {
                pills.push({
                    text: "Overdue",
                    color: {
                        red: 0xcc,
                        green: 0,
                        blue: 0,
                    },
                    message: `Target date was ${Util.msecToDate(targetDateMsec).toLocaleDateString()}`
                })
            }
        }
    }
    return pills;
}

function getSomeFieldChange(what: string, prop: (wi: Db.WorkItemSnapshot) => any | undefined, wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): HuddleSlideFieldChange {
    let s1: string = ""
    let s2: string = ""

    if (prop(wi1)) {
        s1 = `${prop(wi1)}`
    } else {
        s1 = "(not set)"
    }

    if (prop(wi2)) {
        s2 = `${prop(wi2)}`

    } else {
        s2 = "(not set)"
    }

    return { what: what, prev: s1, next: s2 }
}

function getParentFieldChange(wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): HuddleSlideFieldChange {
    let s1: string = ""
    let s2: string = ""

    if (wi1.parent) {
        s1 = `#${wi1.parent}`
    } else {
        s1 = "(not set)"
    }

    if (wi2.parent) {
        s2 = `#${wi2.parent}`

    } else {
        s2 = "(not set)"
    }

    return { what: "System.Parent", prev: s1, next: s2 }
}

function getCommentFieldChange(wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): HuddleSlideFieldChange {
    let s1: string = ""
    let s2: string = ""

    if (wi1.comments && (wi1.comments?.length || 0) > 0) {
        s1 = `${wi1.comments?.length}`
    } else {
        s1 = "0"
    }

    if (wi2.comments && (wi2.comments?.length || 0) > 0) {
        s2 = `${wi2.comments?.length}`

    } else {
        s2 = "0"
    }

    return { what: "System.CommentCount", prev: s1, next: s2 }
}

function HuddleSessionPage(p: HuddleSessionPageProps) {
    const [state, dispatch] = React.useReducer<(state: ReducerState, action: ReducerAction) => ReducerState>(reducer, {
        title: "",
        availableWorkItemTypes: [],
        selectedSlide: null,
    })

    Util.useInterval(poll, 1000);

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let huddle = await Db.getHuddleDocument(p.huddleId, p.session)
        if (!huddle) {
            // TODO: fail
            console.error("HuddleSessionPage: missing huddle");
            return
        }

        console.log("HuddleSessionPage: huddle", huddle);

        let t = await Azdo.getWorkItemTypes(p.session) // TODO: make separately async?

        let huddleSession = await Db.requireHuddleSessionStoredDocument(p.huddleSessionId, p.session)
        let created = huddleSession.created || Util.msecNow()
        huddleSession.created = created
        console.log("HuddleSessionPage: huddle session", huddleSession, created);
        dispatch({
            title: `${huddle?.name || ""} Session - ${Util.msecToDate(created).toLocaleDateString()}`,
            created: created,
            availableWorkItemTypes: t.value,
        })

        let snapShot2 = huddleSession.snapshot
        // TODO: FOR DEBUGGING ONLY, ALWAYS GENERATE A NEW SNAPSHOT!
        snapShot2 = undefined
        // TODO: REMOVE THIS DEBUGGING CODE

        if (!snapShot2) {
            let workItemQuery = huddle.workItemQuery
            if (!workItemQuery) {
                // TODO: fail
                console.error("HuddleSessionPage: missing work item query");
                return
            }

            snapShot2 = await getSnapshot(workItemQuery, created, p.session)
            huddleSession.snapshot = snapShot2
        }

        let savedHuddleSession = await Db.upsertHuddleSession(huddleSession, p.session)
        if (!savedHuddleSession) {
            console.error("failed to upsert huddle session:", huddleSession)
        }

        let snapShot1: Db.HuddleSessionSnapshot;
        if (p.previousHuddleSessionId) {
            let previousHuddleSession = await Db.requireHuddleSessionStoredDocument(p.previousHuddleSessionId, p.session)
            if (!previousHuddleSession.snapshot) {
                snapShot1 = {
                    workitems: {
                        items: []
                    }
                }
            } else {
                snapShot1 = previousHuddleSession.snapshot
            }
        } else {
            snapShot1 = {
                workitems: {
                    items: []
                }
            }
        }

        // TODO: PERSIST ALL CHANGES TO HUDDLE SESSION
        console.log("Snapshot1:", snapShot1)
        console.log("Snapshot2:", snapShot2)
        dispatch({
            snapShot1: snapShot1,
            snapShot2: snapShot2,
        })
    }

    async function getSnapshot(query: Db.HuddleWorkItemQuery, asOf: number | null, session: Azdo.Session): Promise<Db.HuddleSessionSnapshot> {
        let workItemsResult = await Db.queryHuddleWorkItems(query, asOf, session)
        console.log("getSnapshot: workitems result:", workItemsResult)

        if (!workItemsResult.workItems) {
            console.error("getSnapshot: no work items result") // TODO: bug?
            return {
                workitems: {
                    items: []
                }
            }
        }

        let batchIds: number[] = workItemsResult.workItems
            .map(i => i.id)
            .filter((id): id is number => id !== undefined)

        let metaBatches: Azdo.GetWorkItemResult[][] = []

        let level = 0
        while (batchIds.length > 0) {
            level = level + 1
            let currentBatchIds = batchIds
            batchIds = []
            let batch = await Azdo.getWorkItemBatchWithChunks(currentBatchIds, null, asOf, session)
            console.log("getSnapshot batch", level, batch.length, batch)

            metaBatches.push(batch)

            for (const wi of batch) {
                let wid = wi.id
                if (!wid) { continue; }

                let parentId = wi.fields?.['System.Parent']
                if (parentId) {
                    batchIds.push(parentId)
                }
            }
        }

        if (metaBatches.length == 0) {
            return {
                workitems: {
                    items: []
                }
            }
        }

        let priorityMappings: PriorityMapping[] = []
        interface PriorityMapping {
            id: number
            values: number[]
        }

        function getPriorityMapping(id: number): number[] | undefined {
            let found = priorityMappings.find(m => m.id === id)
            if (found === undefined) { return undefined }
            return found.values
        }

        let items: Db.WorkItemSnapshot[] = []
        for (let m = metaBatches.length - 1; m >= 0; m--) {
            let metaBatch = metaBatches[m]
            for (let wi of metaBatch) {
                let wid = wi.id
                let wif = wi.fields
                if (!wid || !wif) { continue; }

                let p0 = wif['Microsoft.VSTS.Common.BacklogPriority'] || Number.MAX_SAFE_INTEGER
                let priorities: number[] = [p0]

                let pid = wif['System.Parent']
                if (pid) {
                    let par = getPriorityMapping(pid)
                    if (par) {
                        priorities = [
                            ...par,
                            p0
                        ]
                    }
                } else {
                    console.warn("No parent for", wid)
                }

                // TODO: error if already exists?

                priorityMappings.push({
                    id: wid,
                    values: priorities,
                })
            }
        }

        console.log("PRIORITY MAPPINGS", priorityMappings)

        let mainBatch = metaBatches[0]
        for (let wi of mainBatch) {
            let wid = wi.id
            let wif = wi.fields
            if (!wid || !wif) { continue; }

            let commentCount = wif['System.CommentCount'] ?? 0;
            let comments = Array.from(
                { length: commentCount },
                (_v, k): Db.WorkItemSnapshotComment => { return { content: `TODO: Comment ${k}` } }
            )

            items.push({
                id: wid,
                title: wif['System.Title'] || "",
                priority: wif['Microsoft.VSTS.Common.Priority'] || Number.MAX_SAFE_INTEGER,
                state: wif['System.State'],
                areaPath: wif['System.AreaPath'],
                iterationPath: wif['System.IterationPath'],
                comments: comments,
                parent: wif['System.Parent'],
                description: wif['System.Description'],
                workItemType: wif['System.WorkItemType'],
                tags: wif['System.Tags'],
                backlogPriority: wif['Microsoft.VSTS.Common.BacklogPriority'],
                backlogPriorities: getPriorityMapping(wid),
                startDate: wif['Microsoft.VSTS.Scheduling.StartDate'],
                targetDate: wif['Microsoft.VSTS.Scheduling.TargetDate'],
                reason: wif['System.Reason'],
            })
        }

        items.sort((a, b) => {
            let ap = a.backlogPriorities
            let bp = b.backlogPriorities

            // missing priority at the bottom
            if (ap == undefined || ap.length < 1) {
                if (bp == undefined || bp.length < 1) { return 0 }
                return 1
            } else if (bp == undefined || bp.length < 1) {
                return -1
            }

            let al = ap.length
            let bl = bp.length
            let ml = al < bl ? al : bl

            for (let l = 0; l < ml; l++) {
                let x = ap[l]
                let y = bp[l]
                if (x < y) { return -1 }
                if (y > x) { return 1 }
            }

            // shorter path implies higher-level work item type
            if (al < bl) { return -1 }
            if (bl < al) { return 1 }

            return 0
        })

        // TODO: produce snapshot
        return {
            workitems: {
                items: items
            }
        }
    }

    async function poll() {
        console.log("HuddleSessionPage poll", state);
    }

    function onSelectSlide(_event: React.SyntheticEvent<HTMLElement, Event>, listRow: IListRow<HuddleSlide>) {
        dispatch({
            selectedSlide: listRow.index
        })
    }

    function renderSlideList() {
        let slides = state.huddleGraph?.slides;
        if (!slides) { return <></> }

        let tasks = new ArrayItemProvider(slides)

        let selection = new ListSelection(true)
        if (state.selectedSlide !== null) {
            selection.select(state.selectedSlide, 1, false, false)
        }

        return (
            <ScrollableList
                itemProvider={tasks}
                renderRow={renderSlideListItem}
                selection={selection}
                onSelect={onSelectSlide}
                width="100%"
            />
        )
    }

    function renderPillGroup(item: HuddleSlide) {
        return <PillGroup className="flex-row" overflow={PillGroupOverflow.wrap}>
            {renderPillForSlideType(item)}
            {(item.pills) && (item.pills.map(p => renderPillListItem(p)))}
            {(item.fieldChanges) && (item.fieldChanges.map(fc => renderPillForFieldChange(fc)))}
        </PillGroup>
    }

    function renderPillForSlideType(item: HuddleSlide) {
        let what: { iconName: string, text: string } | undefined = (() => {
            switch (item.type) {
                case "new": return { iconName: "AddTo", text: "New" }
                case "final": return { iconName: "Blocked2", text: "Removed" }
                case "update": return undefined; // shown via field changes
                case "same": return undefined; // nothing interesting
                default: return undefined
            }
        })();

        if (!what) { return <></> }
        return <Pill variant={PillVariant.themedStandard} iconProps={{ iconName: what.iconName }} >{what.text}</Pill>
    }

    function iconPropsForSlideType(type: string): IIconProps {
        switch (type) {
            case "new": return { iconName: "AddTo" }
            case "final": return { iconName: "Blocked2" }
            case "update": return { iconName: "Edit" }
            case "same": return { iconName: "CircleRing" }
            default: return { iconName: "QuickNoteSolid" }
        }
    }

    function renderIconForSlideType(item: HuddleSlide) {
        let what: IIconProps = (() => { return iconPropsForSlideType(item.type) })();
        return <Icon iconName={what.iconName} size={IconSize.medium} />
    }

    function renderWorkItemHeader(item: HuddleSlide, className: string = ""): JSX.Element {
        return (
            <div className={`flex-row rhythm-horizontal-8 ${className}`}>
                {renderIconForWorkItemType(item)}
                <div className="wrap-text font-weight-semibold">{item.id}</div>
                <div className="wrap-text secondary-text">{item.title}</div>
            </div>
        )
    }

    function renderIconForWorkItemType(item: HuddleSlide) {
        let availableWorkItemTypes = state.availableWorkItemTypes
        let wit = item.workItemType || "unknown";
        let wit2 = availableWorkItemTypes.findIndex(i => i.name === wit);
        let wit3 = (wit2 === -1) ? undefined : availableWorkItemTypes[wit2].icon
        if (wit3 && wit3.url) {
            return <Icon render={() => {
                return <img src={wit3.url} width={16} height={16} />
            }} />
        }
        else { return <></> }
    }

    function renderPillListItem(p: HuddleSlidePill) {
        if (p.color) {
            return <Pill variant={PillVariant.themedStandard} color={p.color}>{p.text}</Pill>
        } else {
            return <Pill variant={PillVariant.themedStandard}>{p.text}</Pill>
        }
    }

    function renderPillForFieldChange(fc: HuddleSlideFieldChange) {
        let what: string = (() => {
            switch (fc.what) {
                case "System.State": return "State"
                case "System.Title": return "Title"
                case "System.Description": return "Description"
                case "System.AreaPath": return "Area"
                case "System.IterationPath": return "Iteration"
                case "System.CommentCount": return "Comments"
                case "System.Parent": return "Parent"
                default: return fc.what
            }
        })();

        return <Pill variant={PillVariant.themedStandard} iconProps={{ iconName: "Edit" }} >{what}</Pill>
    }

    function renderSlideListItem(rowIndex: number, item: HuddleSlide, details: IListItemDetails<HuddleSlide>, key?: string) {
        return (
            <ListItem key={key || "list-item" + rowIndex} index={rowIndex} details={details}>
                <div className="list-example-row flex-row h-scroll-hidden padding-8 rhythm-horizontal-8">
                    {renderIconForSlideType(item)}
                    <div className="flex-column h-scroll-hidden rhythm-vertical-4">
                        {renderWorkItemHeader(item, "font-size-ms")}
                        {renderPillGroup(item)}
                    </div>
                </div>
            </ListItem>
        )
    }

    async function onOpenWorkItem(wid: number) {
        const navSvc = await SDK.getService<IWorkItemFormNavigationService>(
            "ms.vss-work-web.work-item-form-navigation-service"
        );

        await navSvc.openWorkItem(wid, true)
    };

    function getSlideBarCommandItems(slide: HuddleSlide) {
        let items: IHeaderCommandBarItem[] = []

        let editItem: IHeaderCommandBarItem = {
            id: "openWorkItem",
            text: "Open",
            iconProps: { iconName: "OpenInNewTab" },
            onActivate: () => {
                onOpenWorkItem(slide.id)
            },
            isPrimary: true,
            important: true,
        }
        items.push(editItem)

        return items;
    }

    function renderSlideContent() {
        let slideIndex = state.selectedSlide
        let slides = state.huddleGraph?.slides
        if (slideIndex === null || slides === undefined || slideIndex >= slides.length) {
            return <></>
        }

        let slide = slides[slideIndex]
        if (!slide) {
            return <></>
        }

        // let s: string = `${slideIndex + 1}`
        // let a: string = `${slides.length}`

        return (
            <div className='padding-left-8 full-width sticky-top-0'>
                <Header
                    titleIconProps={iconPropsForSlideType(slide.type)}
                    title={renderWorkItemHeader(slide, "font-size-ml")}
                    titleSize={TitleSize.Medium}
                    commandBarItems={getSlideBarCommandItems(slide)}
                />
                <Card className='flex-self-start'>
                    <div className='flex-column full-width flex-start rhythm-vertical-4'>
                        {
                            slide.pills.map(p => {
                                return (
                                    <div className='flex-row flex-center rhythm-horizontal-4'>
                                        <div className=''>{renderPillListItem(p)}</div>
                                        <div className=''>{p.message || ""}</div>
                                    </div>
                                )
                            })
                        }
                        {
                            slide.fieldChanges.map(c => {
                                return (
                                    <div className='flex-row flex-center rhythm-horizontal-4'>
                                        <div className=''>{renderPillForFieldChange(c)}</div>

                                        <div className='flex-row rhythm-horizontal-8'>
                                            <div>{c.prev}</div>
                                            <div className='flex-self-center'><Icon iconName={"Forward"} size={IconSize.medium} /></div>
                                            <div>{c.next}</div>
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </Card>
            </div>
        );
    }

    // function renderHeader() {
    //     return <SingleLayerMasterPanelHeader title={"Slides"} />
    // }

    function renderContent(_selection: any, _itemProvider: any) {
        return (renderSlideList())
    }

    // const [selection] = React.useState(new ListSelection({ selectOnFocus: false }));
    let selection = new ListSelection(true)
    // const [itemProvider] = React.useState(new ArrayItemProvider(sampleDate));
    let itemProvider = new ArrayItemProvider(state.huddleGraph?.slides || [])
    // const [selectedItemObservable] = React.useState(new ObservableValue<string>(sampleDate[0]));

    return (
        <Page className='full-height'>
            <Header
                title={state.title}
                titleSize={TitleSize.Large}
                backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
            />
            <div className="page-content page-content-top">
                <div className="flex-row flex-start">
                    <SingleLayerMasterPanel
                        className="master-example-panel show-on-small-screens"
                        // renderHeader={renderHeader}
                        renderContent={() => renderContent(selection, itemProvider)}
                    />
                    {renderSlideContent()}
                </div>
            </div>
        </Page>
    )
}

export interface HuddleSessionPageProps {
    huddleId: string
    huddleSessionId: string
    previousHuddleSessionId?: string
    appNav: AppNav;
    database: Db.Database;
    session: Azdo.Session;
}

export default HuddleSessionPage


