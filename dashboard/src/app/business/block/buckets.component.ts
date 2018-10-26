import { Router,ActivatedRoute } from '@angular/router';
import { Component, OnInit, ViewContainerRef, ViewChild, Directive, ElementRef, HostBinding, HostListener } from '@angular/core';
import { I18NService ,Consts} from 'app/shared/api';
import { AppService } from 'app/app.service';
import { trigger, state, style, transition, animate} from '@angular/animations';
import { I18nPluralPipe } from '@angular/common';
import { FormControl, FormGroup, FormBuilder, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { MenuItem ,ConfirmationService} from '../../components/common/api';
import { BucketService} from './buckets.service';
import { debug } from 'util';
import { MigrationService } from './../dataflow/migration.service';
import { Http } from '@angular/http';
declare let X2JS:any;
@Component({
    selector: 'bucket-list',
    templateUrl: './buckets.html',
    styleUrls: [],
    providers: [ConfirmationService],
    animations: [
        trigger('overlayState', [
            state('hidden', style({
                opacity: 0
            })),
            state('visible', style({
                opacity: 1
            })),
            transition('visible => hidden', animate('400ms ease-in')),
            transition('hidden => visible', animate('400ms ease-out'))
        ]),

        trigger('notificationTopbar', [
            state('hidden', style({
            height: '0',
            opacity: 0
            })),
            state('visible', style({
            height: '*',
            opacity: 1
            })),
            transition('visible => hidden', animate('400ms ease-in')),
            transition('hidden => visible', animate('400ms ease-out'))
        ])
    ]
})
export class BucketsComponent implements OnInit{
    selectedBuckets=[];
    allBuckets = [];
    createBucketForm:FormGroup;
    errorMessage = [];
    createBucketDisplay=false;
    showLife = false;
    backendsOption = [];
    lifeOperation = [];
    lifeOperation1 = [];
    allBackends = [];
    allTypes = [];
    excute = [];
    dataAnalysis = [];
    createMigrateShow = false;
    selectTime = true;
    showAnalysis = false;
    migrationForm:FormGroup;
    analysisForm:FormGroup;
    bucketOption = [];
    availbucketOption =[];
    backendMap = new Map();
    selectedBucket = {
        name:"",
        id:""
    };
    selectType;
    engineOption = [];
    constructor(
        public I18N: I18NService,
        private router: Router,
        private ActivatedRoute:ActivatedRoute,
        private confirmationService: ConfirmationService,
        private fb:FormBuilder,
        private BucketService: BucketService,
        private MigrationService:MigrationService,
        private http:Http,
    ){
        this.createBucketForm = this.fb.group({
            "backend":[""],
            "backend_type":[""],
            "name":[""]
        });
        this.migrationForm = this.fb.group({
            "migrationName":[""],
            "destBucket":[""],
            "excutingTime":[""],
            "rule":[""],
            "deleteSrcObject":[""],
            "execute": ["true"],
            "anaShow":[""]
        });
        this.analysisForm = this.fb.group({
            "analysisCluster":[""],
            "ak":[""],
            "sk":[""],
            "jar":[""],
            "anaparam":[""]
        });
    }

    ngOnInit() {
        this.allBuckets = [
            {
                name:"test",
                backend:"OS_ch_beijing_eastern",
                created:"2018-02-25 07:30:12",
            },
            {
                name:"bucket_s3",
                backend:"OS_ch_beijing_western",
                created:"2018-02-25 07:30:12",
            }
        ];
        this.lifeOperation =[{
            label:'Migration',
            value:'Migration'
        },
        {
            label:'Delete',
            value:'Delete'
        }];
        this.lifeOperation1 =[
        {
            label:'Delete',
            value:'Delete'
        },{
            label:'Migration',
            value:'Migration'
        }];
        this.allBackends = [{
            label:'AWS S3',
            value:'AWS S3'
        },
        {
            label:'MicrosoftAzure Blob Storage',
            value:'MicrosoftAzure Blob Storage'
        },
        {
            label:'Huawei HWC',
            value:'Huawei HWC'
        },
        {
            label:'Huawei FusionCloud',
            value:'Huawei FusionCloud'
        }
        ];
        this.getBuckets();
        // this.getBackends();
    }
    showcalendar(){
        this.selectTime = !this.selectTime;
    }
    showDetail(){
        this.showAnalysis = !this.showAnalysis;
    }
    configMigration(bucket){
        this.availbucketOption = [];
        this.createMigrateShow=true;
        this.selectedBucket = bucket;
        this.migrationForm.reset();
        this.migrationForm.controls['execute'].setValue("true");
        this.analysisForm.reset();
        this.selectTime = true;
        this.showAnalysis = false;
        this.bucketOption.forEach((value,index)=>{
            if(this.backendMap.get(value.label) !== this.backendMap.get(bucket.name)){
                this.availbucketOption.push({
                    label:value.label,
                    value:value.value
                });
            }
        });
        this.engineOption = [];
        this.http.get("v1beta/{project_id}/file?bucket_id="+bucket.id).subscribe((res)=>{
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
    getBuckets() {
        this.allBuckets = [];
        this.bucketOption = [];
        this.BucketService.getBuckets().subscribe((res) => {
            let str = res._body;
            let x2js = new X2JS();
            let jsonObj = x2js.xml_str2json(str);
            let buckets = (jsonObj ? jsonObj.ListAllMyBucketsResult.Buckets:[]);
            if(Object.prototype.toString.call(buckets) === "[object Array]"){
                this.allBuckets = buckets;
            }else if(Object.prototype.toString.call(buckets) === "[object Object]"){
                this.allBuckets = [buckets];
            }
            this.allBuckets.forEach(item=>{
                item.name =item.Name;
                item.createdAt = (item.CreationDate.substring(0,19)).replace("T"," ");
                this.bucketOption.push({
                    label:item.name,
                    value:item.name
                });
                //this.backendMap.set(item.name,item.backend);
            });
            this.initBucket2backendAnd2Type();
        });
    }
    initBucket2backendAnd2Type(){
        this.http.get('v1/s3').subscribe((res)=>{
            let str = res['_body'];
            let x2js = new X2JS();
            let jsonObj = x2js.xml_str2json(str);
            let buckets = (jsonObj ? jsonObj.ListAllMyBucketsResult.Buckets:[]);
            let allBuckets = [];
            if(Object.prototype.toString.call(buckets) === "[object Array]"){
                allBuckets = buckets;
            }else if(Object.prototype.toString.call(buckets) === "[object Object]"){
                allBuckets = [buckets];
            }
            Consts.BUCKET_BACKND.clear();
            Consts.BUCKET_TYPE.clear();
            this.http.get('v1/{project_id}/backends').subscribe((res)=>{
                let backends = res.json().backends ? res.json().backends :[];
                let backendsObj = {};
                backends.forEach(element => {
                    backendsObj[element.name]= element.type;
                });
                allBuckets.forEach(item=>{
                    Consts.BUCKET_BACKND.set(item.Name,item.LocationConstraint);
                    Consts.BUCKET_TYPE.set(item.Name,backendsObj[item.LocationConstraint]);
                });
            });
        });
    }
    getTypes() {
        this.allTypes = [];
        this.BucketService.getTypes().subscribe((res) => {
            res.json().types.forEach(element => {
                this.allTypes.push({
                    label: element.name,
                    value: element.name
                })
            });
        });
    }
    createMigration(){
        let param = {
            "name": this.migrationForm.value.migrationName,
            "srcBucket": this.selectedBucket.name,
            "destBucket": this.migrationForm.value.destBucket,
            "rule": this.migrationForm.value.rule ? this.migrationForm.value.rule:"--",
            "deleteSrcObject": this.migrationForm.value.deleteSrcObject && this.migrationForm.value.deleteSrcObject.length !== 0,
        }
        if(!this.selectTime){
            let param2 = {
                "excutingTime":this.migrationForm.value.excutingTime ,
            }
            Object.assign(param,param2);
        }
        if(this.showAnalysis){
            let param3 = {
                "analysisCluster": this.analysisForm.value.analysisCluster,
                "ak": this.analysisForm.value.ak,
                "sk": this.analysisForm.value.sk,
                "jar":this.analysisForm.value.jar,
                "anaparam":this.analysisForm.value.anaparam,
            }
            Object.assign(param,param3);
        }
        this.MigrationService.createMigration(param).subscribe((res) => {
            this.createMigrateShow = false;
        });
    }
    getBackendsByTypeId() {
        this.backendsOption = [];
        this.BucketService.getBackendsByTypeId(this.selectType).subscribe((res) => {
            let backends = res.json().backends ? res.json().backends :[];
            backends.forEach(element => {
                this.backendsOption.push({
                    label: element.name,
                    value: element.name
                })
            });
        });
    }

    getBackends() {
        this.allBackends = [];
        this.BucketService.getBckends().subscribe((res) => {
            res.json().forEach(element => {
                if(element.type != "5"){
                    this.allBackends.push({
                        label: element.name,
                        value: element.name
                    })
                }
            });
        });
    }

    creatBucket(){
        let param = {
            name:this.createBucketForm.value.name,
            backend_type:this.createBucketForm.value.backend_type,
            backend:this.createBucketForm.value.backend,
        };
        let xmlStr = `<CreateBucketConfiguration xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\">
                        <LocationConstraint>${this.createBucketForm.value.backend}</LocationConstraint>
                    </CreateBucketConfiguration>`
        this.BucketService.createBucket(this.createBucketForm.value.name,xmlStr).subscribe(()=>{
            this.createBucketDisplay = false;
            this.getBuckets();
        });
        
    }
    showCreateForm(){
        this.createBucketDisplay = true;
        this.createBucketForm.reset();
        this.getTypes();
    }
    deleteBucket(bucket){
        let msg = "<div>Are you sure you want to delete the Bucket ?</div><h3>[ "+ bucket.name +" ]</h3>";
        let header ="Delete";
        let acceptLabel = "Delete";
        let warming = true;
        this.confirmDialog([msg,header,acceptLabel,warming,"delete"], bucket)
    }
    configLife(bucket){
        this.showLife = true;
    }
    confirmDialog([msg,header,acceptLabel,warming=true,func], bucket){
        this.confirmationService.confirm({
            message: msg,
            header: header,
            acceptLabel: acceptLabel,
            isWarning: warming,
            accept: ()=>{
                try {
                    let name = bucket.name;
                    this.BucketService.deleteBucket(name).subscribe((res) => {
                        this.getBuckets();
                    },
                    error=>{
                        this.getBuckets();
                    });
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
