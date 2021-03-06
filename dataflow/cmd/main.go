// Copyright (c) 2018 Huawei Technologies Co., Ltd. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"github.com/micro/go-log"
	"github.com/micro/go-micro"
	handler "github.com/opensds/multi-cloud/dataflow/pkg"
	pb "github.com/opensds/multi-cloud/dataflow/proto"
	"github.com/opensds/multi-cloud/datamover/proto"
	"github.com/micro/go-micro/client"
	"github.com/opensds/multi-cloud/dataflow/pkg/scheduler"
	_ "github.com/opensds/multi-cloud/dataflow/pkg/scheduler/trigger/crontrigger"
)

func main() {
	service := micro.NewService(
		micro.Name("dataflow"),
	)

	service.Init()
	dm := datamover.NewDatamoverService("datamover", client.DefaultClient)
	pb.RegisterDataFlowHandler(service.Server(), handler.NewDataFlowService(dm))
	scheduler.LoadAllPlans(dm)
	if err := service.Run(); err != nil {
		log.Log(err)
	}
}
