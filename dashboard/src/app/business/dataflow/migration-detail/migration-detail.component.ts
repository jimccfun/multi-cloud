import { Component, Input, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { I18NService, Utils } from 'app/shared/api';
import { MigrationService } from '../migration.service';

@Component({
  selector: 'migration-detail',
  templateUrl: './migration-detail.component.html',
  styleUrls: [

  ]
})
export class MigrationDetailComponent implements OnInit {
  @Input() migrationId;

  migrationInstance = {
    "name": "migration_04",
    "srcBucket": "bucket02",
    "destBucket": "bucket01",
    "excutingTime": 1538014530000,
    "rule": "",
    "configDataAnalysis": false,
    "analysisCluster": "",
    "ak": "",
    "sk": "",
    "deleteSrcObject": true,
    "id": "urV3BwUkHVaLdvUf",
    "status": "migrating",
    "endTime": "",
    "_id": "urV3BwUkHVaLdvUf",
    "srcBackend": "",
    "destBackend": "",
    "ana_status":"",
    "objectnum":0,
    "totalsize":"0 MB"
  }

  constructor(
    private ActivatedRoute: ActivatedRoute,
    public I18N: I18NService,
    private MigrationService: MigrationService,
  ) { }

  ngOnInit() {
    this.getMigrationById();
  }

  getMigrationById() {
    this.MigrationService.getMigrationById(this.migrationId).subscribe((res) => {
      this.migrationInstance = res.json();
      // 获取 bucket 所属的 backend
      this.MigrationService.getBucketByName(this.migrationInstance.srcBucket).subscribe((res) => {
        this.migrationInstance.srcBackend = res.json()[0].backend;
      }
      )
      this.MigrationService.getBucketByName(this.migrationInstance.destBucket).subscribe((res) => {
        this.migrationInstance.destBackend = res.json()[0].backend;
      }
      )
    });
  }

}
