// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package bookworm.thumbnails;

import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.sqs.SqsClient;

import bookworm.thumbnails.processors.MessageProcessor;

@SuppressWarnings("InfiniteLoopStatement")
public class App {
  public static String queue;
  public static String bucketName;

  public static String prefix;

  public static boolean optimized;

  private static boolean reuseMapper;
  private static boolean reuseLogger;

  private static final S3Client sharedS3 = s3Client();
  private static final SqsClient sharedSQS = sqsClient();
  private static final ObjectMapper sharedObjectMapper = objectMapper();
  private static final Logger sharedLogger = logger();
  private static final ExecutorService sharedExecutor = executor();

  private static String getEnvironmentVariable(String key) {
    String value = System.getenv(key);

    if (value == null || value.isEmpty()) {
      throw new IllegalStateException(String.format("Environment variable %s must be set", key));
    }

    return value;
  }

  static {
    queue = getEnvironmentVariable("QUEUE_NAME");
    bucketName = getEnvironmentVariable("COVERS_STORAGE_BUCKET_NAME");
    prefix = getEnvironmentVariable("COVERS_STORAGE_PREFIX");
  }

  public static void main(String[] args) throws Exception {
    String optimizedFlag = System.getenv("OPTIMIZED_IMPLEMENTATION");

    if (optimizedFlag == null || optimizedFlag.isEmpty()) {
      logger().warn("Running with performance issues. :(");

      optimized = false;
      reuseMapper = false;
      reuseLogger = false;
    } else {
      logger().info("Running without performance issues. :)");

      optimized = true;
      reuseMapper = true;
      reuseLogger = true;
    }

    MessageProcessor processor = new MessageProcessor();

    while (true) {
      executor().submit(processor::run).get();
    }
  }

  public static S3Client s3Client() {
    if (sharedS3 != null) {
      return sharedS3;
    } else {
      return S3Client.builder().build();
    }
  }

  public static SqsClient sqsClient() {
    if (sharedSQS != null) {
      return sharedSQS;
    } else {
      return SqsClient.builder().build();
    }
  }

  public static ObjectMapper objectMapper() {
    if (reuseMapper && sharedObjectMapper != null) {
      return sharedObjectMapper;
    } else {
      ObjectMapper mapper = new ObjectMapper();

      mapper.configure(MapperFeature.ACCEPT_CASE_INSENSITIVE_PROPERTIES, true);
      mapper.setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY);

      return mapper;
    }
  }

  public static Logger logger() {
    if (reuseLogger && sharedLogger != null) {
      return sharedLogger;
    } else {
      return LogManager.getLogger(App.class);
    }
  }

  private static ExecutorService executor() {
    return Objects.requireNonNullElseGet(sharedExecutor, Executors::newCachedThreadPool);
  }
}
