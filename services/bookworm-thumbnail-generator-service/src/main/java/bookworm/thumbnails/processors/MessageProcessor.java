// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package bookworm.thumbnails.processors;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;

import net.coobird.thumbnailator.Thumbnails;

import org.apache.commons.io.FilenameUtils;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

import bookworm.thumbnails.App;
import bookworm.thumbnails.models.CustomS3Event;
import bookworm.thumbnails.models.CustomS3Record;

public class MessageProcessor {
  private final static double THUMBNAIL_SCALE = 0.25;

  public void run() {
    try {
      List<Message> messages = extractTasks(App.queue);

      App.logger().debug(String.format("Received %d messages", messages.size()));

      for (Message message : messages) {
        App.logger().debug("Processing message...");

        CustomS3Event event = App.objectMapper().readValue(message.body(), CustomS3Event.class);

        for (CustomS3Record record : event.Records) {
          String imageKey = record.s3.object.key;
          String imageName = Paths.get(imageKey).getFileName().toString();
          String baseName = FilenameUtils.getBaseName(imageName);
          String extension = FilenameUtils.getExtension(imageName);

          App.logger().debug(String.format("Book cover image name: %s", imageName));

          Path outputFileName = Paths.get(String.format("%s-%s", Instant.now().toString(), imageName));

          GetObjectRequest downloadRequest = GetObjectRequest.builder().bucket(App.bucketName).key(imageKey).build();
          App.s3Client().getObject(downloadRequest, ResponseTransformer.toFile(outputFileName));

          Thumbnails.of(outputFileName.toFile()).scale(THUMBNAIL_SCALE).toFile(outputFileName.toFile());
          upload(String.format("%s%s.thumbnail.%s", App.prefix, baseName, extension), outputFileName.toFile());

          deleteFile(outputFileName.toFile());
        }

        App.sqsClient().deleteMessage(
          DeleteMessageRequest.builder().queueUrl(App.queue).receiptHandle(message.receiptHandle()).build()
        );
      }
    } catch (Exception exception) {
      App.logger().debug(String.format("MessageProcessor failed: %s", exception));
      exception.printStackTrace();
    }
  }

  private List<Message> extractTasks(String queueName) {
    ReceiveMessageRequest request = ReceiveMessageRequest.builder().queueUrl(queueName).maxNumberOfMessages(10).build();
    ReceiveMessageResponse response = App.sqsClient().receiveMessage(request);

    List<Message> messages = response.messages();

    try {
      if (!App.optimized) {
        for (int i = 0; i < 10; ++i) {
          String pointless = App.objectMapper().writeValueAsString(App.sqsClient().getClass());
          App.logger().debug(String.format("Pointless work: %s", pointless));
          App.logger().error(String.format("Expensive exception: %s", new Exception()));
        }

        App.logger().debug(String.format("Result from SQS: %s", App.objectMapper().writeValueAsString(response)));
        App.logger().debug(String.format("Messages: %s", App.objectMapper().writeValueAsString(messages)));
      }
    } catch (JsonProcessingException exception) {
      exception.printStackTrace();
    }

    return messages;
  }

  private void upload(String fileName, File file) {
    App.s3Client().putObject(
      PutObjectRequest.builder().bucket(App.bucketName).key(fileName).build(),
      RequestBody.fromFile(file)
    );
  }

  private void deleteFile(File file) {
    if (!file.delete()) {
      App.logger().debug(String.format("Failed to remove file: %s", file.getPath()));
    }
  }
}
