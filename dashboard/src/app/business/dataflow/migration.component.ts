import { Component, OnInit, ViewContainerRef, ViewChild, Directive, ElementRef, HostBinding, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService, Utils } from 'app/shared/api';
import { FormControl, FormGroup, FormBuilder, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { AppService } from 'app/app.service';
import { I18nPluralPipe } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MenuItem ,ConfirmationService} from '../../components/common/api';
import { identifierModuleUrl } from '@angular/compiler';
import { MigrationService } from './migration.service';
import { BucketService } from './../block/buckets.service';
import { Http } from '@angular/http';

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
    excute = ["true"];
    showAnalysis = false;
    deleteSrcObject = [];
    selectTime = true;
    bucketOption = [];
    migrationName = "";
    ak = "";
    sk = "";
    analysisCluster = "";
    srcBucket = "";
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
    constructor(
        public I18N: I18NService,
        private router: Router,
        private confirmationService: ConfirmationService,
        private fb: FormBuilder,
        private MigrationService: MigrationService,
        private BucketService:BucketService,
        private http: Http
    ) {

    }

    ngOnInit() {
        this.allMigrations = []
        this.getBuckets();
    }
    configCreateMigration(){
        this.createMigrateShow=true;
        this.migrationName = "";
        this.srcBucket = "";
        this.destBucket = "";
        this.rule ="";
        this.showAnalysis = false;
        this.analysisCluster= "";
        this.ak ="";
        this.sk ="";
        this.deleteSrcObject =[];
        this.jarParam ="";
        this.anaParam ="";
        this.excute = ["true"];
        this.selectTime = true;
        this.dataAnalysis = [];
        this.excutingTime="";
    }
    getBuckets() {
        this.bucketOption = [];
        this.BucketService.getBuckets().subscribe((res) => {
            let allbuckets = res.json();
            allbuckets.forEach(element => {
                this.bucketOption.push({
                    label:element.name,
                    value:element.name
                });
                this.backendMap.set(element.name,element.backend);
                this.bucketMap.set(element.name,element);
            });
            this.getMigrations();
        });
    }
    changeSrcBucket(){
        this.destBuckets = [];
        this.engineOption = [];
        this.bucketOption.forEach((value,index)=>{
            if(this.backendMap.get(value.label) !== this.backendMap.get(this.srcBucket)){
                this.destBuckets.push({
                    label:value.label,
                    value:value.value
                });
            }
        });
        this.http.get("v1beta/{project_id}/file?bucket_id="+this.bucketMap.get(this.srcBucket).id).subscribe((res)=>{
            let allFile = res.json();
            for(let item of allFile){
                if(item.name == "driver_behavior.jar"){
                    this.engineOption = [{
                        label:"driver_behavior.jar",
                        value:"driver_behavior.jar"
                    }];
                    break;
                }
            }
        });
    }
    getMigrations() {
        this.allMigrations = [];
        this.MigrationService.getMigrations().subscribe((res) => {
            this.allMigrations = res.json();
            this.allMigrations.forEach((item,index)=>{
                let p1 = this.http.get("v1beta/{project_id}/backend?name="+this.backendMap.get(item.srcBucket)).toPromise();
                let p2 = this.http.get("v1beta/{project_id}/backend?name="+this.backendMap.get(item.destBucket)).toPromise();
                Promise.all([p1, p2]).then(function (results) {
                    if(results[0].json().length !== 0){
                        item.srctype = results[0].json()[0].type;
                    }
                    if(results[1].json().length !== 0){
                        item.desttype = results[1].json()[0].type;
                    }
                });
            });
        });
    }

    createMigration() {
        let excutingTime = new Date().getTime();
        if (!this.selectTime) {
            excutingTime = this.excutingTime.getTime();
        }
        let param = {
            "name": this.migrationName,
            "srcBucket": this.srcBucket,
            "destBucket": this.destBucket,
            "excutingTime": excutingTime,
            "rule": this.rule ? this.rule :"--" ,
            "configDataAnalysis": this.showAnalysis,
            "analysisCluster": this.analysisCluster,
            "ak": this.ak,
            "sk": this.sk,
            "deleteSrcObject": this.deleteSrcObject.length !== 0 ,
            "jar":this.jarParam,
            "anaparam":this.anaParam
        }
        this.MigrationService.createMigration(param).subscribe((res) => {
            this.createMigrateShow = false;
            this.getMigrations();
        });

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
        if(this.excute.length !== 0){
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
                            this.ngOnInit();
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
