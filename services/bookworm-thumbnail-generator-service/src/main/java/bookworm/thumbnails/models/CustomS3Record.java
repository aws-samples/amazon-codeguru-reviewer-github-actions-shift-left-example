// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package bookworm.thumbnails.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CustomS3Record {
  public CustomS3Section s3;

  public CustomS3Record() {
    this.s3 = new CustomS3Section();
  }
}
