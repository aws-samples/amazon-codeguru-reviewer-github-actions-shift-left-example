// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package bookworm.thumbnails.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CustomS3Section {
  public CustomS3ObjectSection object;

  public CustomS3Section() {
    this.object = new CustomS3ObjectSection();
  }
}
