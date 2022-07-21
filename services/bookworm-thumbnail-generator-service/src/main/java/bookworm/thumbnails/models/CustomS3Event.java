// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package bookworm.thumbnails.models;

import java.util.List;

public class CustomS3Event {
  public List<CustomS3Record> Records;

  public CustomS3Event() {
    this.Records = List.of();
  }
}
