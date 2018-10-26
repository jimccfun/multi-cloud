import { Component, OnInit, ViewContainerRef, ViewChild, Directive, ElementRef, HostBinding, HostListener,EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService, Utils ,Consts} from 'app/shared/api';
import { FormControl, FormGroup, FormBuilder, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { AppService } from 'app/app.service';
import { I18nPluralPipe } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MenuItem ,ConfirmationService} from '../../components/common/api';
import { identifierModuleUrl } from '@angular/compiler';
import { MigrationService } from './migration.service';
import { BucketService } from './../block/buckets.service';
import { Http } from '@angular/http';
import { ReactiveFormsModule, FormsModule} from '@angular/forms';
declare let X2JS:any;
let _ = require("underscore");
@Component({
    selector: 'migration-list',
    templateUrl: 'migration.html',
    providers: [ConfirmationService],
    styleUrls: [],
    animations: []
})
export class MigrationListComponent implements OnInit {
    allMigrations = [];
    selectedMigrations = [];
    createMigrateShow = false;
    createMigrationForm:FormGroup;
    dataAnalysis = [];
    excute = true;
    showAnalysis = false;
    deleteSrcObject = [];
    selectTime = true;
    bucketOption = [];
    migrationName = "";
    ak = "";
    sk = "";
    analysisCluster = "";
    destBucket = "";
    destBuckets = [];
    backendMap = new Map();
    bucketMap = new Map();
    anaParam = "";
    jarParam = "";
    engineOption = [];
    rule = "";
    excutingTime;
    migrationId: string;
    type2svg = {
        "aws":'aws.svg',
        "obs":"huawei.svg",
        "FusionCloud":'private-cloud.svg'
    }
    constructor(
        public I18N: I18NService,
        private router: Router,
        private confirmationService: ConfirmationService,
        private fb: FormBuilder,
        private MigrationService: MigrationService,
        private BucketService:BucketService,
        private http: Http
    ) {
        this.createMigrationForm = this.fb.group({
            "name": ['',{validators:[Validators.required], updateOn:'change'}],
            "srcBucket": ['',{validators:[Validators.required], updateOn:'change'}],
            "destBucket":['',{validators:[Validators.required], updateOn:'change'}],
            "rule":[''],
            "deleteSrcObject":[false],
            "excuteTime":[false],
            "excute":[true]
        });
    }
    @Output() changeNumber = new EventEmitter<boolean>();

    ngOnInit() {
        this.allMigrations = []
        this.getBuckets();
        
    }
    configCreateMigration(){
        this.createMigrateShow=true;
        this.createMigrationForm.reset(
            {
            'name':'',
            "deleteSrcObject":false,
            "excuteTime":false,
            "excute":true
            }
        );
    }
    getBuckets() {
        this.bucketOption = [];
        this.BucketService.getBuckets().subscribe((res) => {
            let str = res._body;
            let x2js = new X2JS();
            let jsonObj = x2js.xml_str2json(str);
            let buckets = (jsonObj ? jsonObj.ListAllMyBucketsResult.Buckets:[]);
            let allBuckets = [];
            if(Object.prototype.toString.call(buckets) === "[object Array]"){
                allBuckets = buckets;
            }else if(Object.prototype.toString.call(buckets) === "[object Object]"){
                allBuckets = [buckets];
            }
            allBuckets.forEach(item=>{
                this.bucketOption.push({
                            label:item.Name,
                            value:item.Name
                        });
            });
            this.getMigrations();
        });
    }
    changeSrcBucket(){
        this.destBuckets = [];
        this.engineOption = [];
        this.bucketOption.forEach((value,index)=>{
           if(Consts.BUCKET_BACKND.get(value.label) !== Consts.BUCKET_BACKND.get(this.createMigrationForm.value.srcBucket)){ // tag wait bucket backend
                this.destBuckets.push({
                    label:value.label,
                    value:value.value
                });
            }
        });
        
    }
    getMigrations() {
        this.allMigrations = [];
        this.MigrationService.getMigrations().subscribe((res) => {
            this.changeNumber.emit(true);
            this.allMigrations = res.json().plans ? res.json().plans :[];
            this.allMigrations.forEach((item,index)=>{
                item.srctype = this.type2svg[Consts.BUCKET_TYPE.get(item.sourceConn.bucketName)];
                item.desttype = this.type2svg[Consts.BUCKET_TYPE.get(item.destConn.bucketName)];
                item.srcBucket = item.sourceConn.bucketName;
                item.destBucket = item.destConn.bucketName;
            });
        });
    }

    createMigration() {
        if(!this.createMigrationForm.valid){
            for(let i in this.createMigrationForm.controls){
                this.createMigrationForm.controls[i].markAsTouched();
            }
            return;
        }
        let param = {
            "name": this.createMigrationForm.value.name,
            "description": "for test",
            "type": "migration",
            "sourceConn": {
                "storType": "opensds-obj",
                "bucketName": this.createMigrationForm.value.srcBucket
            },
            "destConn": {
                "storType": "opensds-obj",
                "bucketName": this.createMigrationForm.value.destBucket
            },
            "filter": {},
            "remainSource": !this.createMigrationForm.value.deleteSrcObject
        }
        if(this.createMigrationForm.value.excute){
            this.MigrationService.createMigration(param).subscribe((res) => {
                this.createMigrateShow = false;
                let planId = res.json().plan.id;
                this.http.post(`v1/{project_id}/plans/${planId}/run`,{}).subscribe((res)=>{});
                this.getMigrations();
            });
        }else{
            let date = new Date(this.createMigrationForm.value.excuteTime);
            let tigger = `00 ${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth()} ${date.getDay()}`
            console.log(tigger);
            let policy={
                "name":"cron test",
                "tenant":"all",
                "description":"cron test function",
                "schedule": {
                    "type":"cron",
                    "tiggerProperties":"22 22 22 22 11 5"
                }
            };
            // console.log(this.createMigrationForm.value.excuteTime);
            this.http.post('v1/{project_id}/policies',policy).subscribe((res)=>{
                param['policyId'] = res.json().policy.id;
                param['policyEnabled'] = true;
                this.MigrationService.createMigration(param).subscribe((res) => {
                    this.createMigrateShow = false;
                    this.getMigrations();
                });
            })
        }        
    }

    onRowExpand(evt) {
        this.migrationId = evt.data.id;
    }

    deleteMigrate(migrate){
        let msg = "<div>Are you sure you want to delete the Migration ?</div><h3>[ "+ migrate.name +" ]</h3>";
        let header ="Delete";
        let acceptLabel = "Delete";
        let warming = true;
        this.confirmDialog([msg,header,acceptLabel,warming,"delete"], migrate)
    }
    showDetail(){
        if(this.dataAnalysis.length !== 0){
         this.showAnalysis = true;
        }else{
         this.showAnalysis = false;
        }
    }
    showcalendar(){
        if(this.createMigrationForm.value.excute){
         this.selectTime = true;
        }else{
         this.selectTime = false;
        }
    }
    remigration(migration){
        let msg = "<div>Are you sure you want to Remigrate ?</div><h3>[ "+ migration.name +" ]</h3>";
        let header ="Remigrate";
        let acceptLabel = "Remigrate";
        let warming = true;
        this.confirmDialog([msg,header,acceptLabel,warming,"Remigrate"], migration)
    }
    confirmDialog([msg,header,acceptLabel,warming=true,func], migrate){
        this.confirmationService.confirm({
            message: msg,
            header: header,
            acceptLabel: acceptLabel,
            isWarning: warming,
            accept: ()=>{
                try {
                    if(func === "Remigrate"){
                        this.http.post('v1beta/{project_id}/remigration',{"id":migrate.id}).subscribe((res)=>{
                            this.getMigrations();
                        });
                    }
                    else if(func === "delete"){
                        let id = migrate.id;
                        this.MigrationService.deleteMigration(id).subscribe((res) => {
                            this.getMigrations();
                        });
                    }
                }
                catch (e) {
                    console.log(e);
                }
                finally {
                    
                }
            },
            reject:()=>{}
        })
    }
}
