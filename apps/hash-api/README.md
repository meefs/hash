# HASH Backend

## Configuration

The HASH Backend API service is configured using the following environment variables:

- `NODE_ENV`: ("development" or "production") the runtime environment. Controls
  default logging levels and output formatting.
- `PORT`: the port number the API will listen on.
- `SELF_HOSTED_HASH`: if `"true"` forces self-hosted behavior, which e.g. loads system types as external types.
- `NODE_API_SENTRY_DSN`: the Sentry DSN to use for error reporting and tracing
- `AWS_REGION`: the AWS region to use (for the Simple Email Service (SES) provider, and as a fallback for other AWS services)
- `FILE_UPLOAD_PROVIDER`: where to store user file uploads. Currently supported values are:
  - `LOCAL_FILE_SYSTEM`: (default) use the local filesystem for file uploads – **not recommended for production use**
  - `AWS_S3`: use an AWS S3-compatible service for file uploads – ensure that the environment variables below are set
- S3 file uploads (ensure that `FILE_UPLOAD_PROVIDER=AWS_S3` is also set):
  - `AWS_S3_REGION`: (optional) the AWS region where the file uploads bucket is located. If not
    provided, `AWS_REGION` is assumed.
  - `AWS_S3_UPLOADS_BUCKET`: the name of the S3 bucket for file uploads. For some in-browser functionality (e.g. document previewing), you must configure a Access-Control-Allow-Origin header on your bucket to be something other than '\*'.
  - `AWS_S3_UPLOADS_ACCESS_KEY_ID`: (optional) the AWS access key ID to use for file uploads. Must be provided along with the secret access key if the API is not otherwise authorized to access the bucket (e.g. via an IAM role).
  - `AWS_S3_UPLOADS_SECRET_ACCESS_KEY`: (optional) the AWS secret access key to use for file uploads.
  - `AWS_S3_UPLOADS_ENDPOINT`: (optional) the endpoint to use for S3 operations. If not, the AWS S3 default for the given region is used. Useful if you are using a different S3-compatible storage provider.
  - `AWS_S3_UPLOADS_FORCE_PATH_STYLE`: (optional) set `true` if your S3 setup requires path-style rather than virtual hosted-style S3 requests.
- Postgres
  - `HASH_PG_HOST`: Postgres hostname.
  - `HASH_PG_PORT`: Postgres connection port.
  - `HASH_PG_DATABASE`: Postgres database name.
  - `HASH_PG_PASSWORD`: Postgres user password.
  - `HASH_PG_USER`: Postgres username.
- Redis
  - `HASH_REDIS_HOST`: the hostname for the Redis server.
  - `HASH_REDIS_PORT`: the port number of the Redis server.
- `FRONTEND_URL`: The URL the frontend is hosted on.
- Vault
  - `HASH_VAULT_HOST`: The host address (including protocol) that the Vault server is running on, e.g. `http://127.0.0.1`
  - `HASH_VAULT_PORT`: The port that the Vault server is running on, e.g. `8200`
  - `HASH_VAULT_ROOT_TOKEN`: The token to authenticate with the Vault server. If not present, login via AWS IAM is attempted instead.
- Google integration
  - `GOOGLE_OAUTH_CLIENT_ID`: the client ID for the Google OAuth application.
  - `GOOGLE_OAUTH_CLIENT_SECRET`: the client secret for the Google OAuth application.
- OpenSearch:
  - `HASH_OPENSEARCH_ENABLED`: (default: `false`) whether OpenSearch is used or not. `true` or `false`.
  - `HASH_OPENSEARCH_HOST`: the hostname of the OpenSearch cluster to connect to.
  - `HASH_OPENSEARCH_PORT`: (default: 9200) the port number that the cluster accepts
    connections on.
  - `HASH_OPENSEARCH_USERNAME`: the username to connect to the cluster as.
  - `HASH_OPENSEARCH_PASSWORD`: the password to use when making the connection.
  - `HASH_OPENSEARCH_HTTPS_ENABLED`: (optional) set to "1" to connect to the cluster
    over an HTTPS connection.
- `INTERNAL_API_KEY`: The API key used to authenticate with HASH (the company)'s internal API, required for some functionality specific to hosted HASH (the app)
- `INTERNAL_API_HOST`: The host for the internal API, required if the internal API is not running locally
- `OPENAI_API_KEY`: The API key used to authenticate with OpenAI's API, used for some non-essential generation functionality (e.g. suggesting the pluralized form of type names)
- `STATSD_ENABLED`: (optional) set to "1" if the service should report metrics to a
  StatsD server. If enabled, the following variables must be set:
  - `STATSD_HOST`: the hostname of the StatsD server.
  - `STATSD_PORT`: (default: 8125) the port number the StatsD server is listening on.
- `HASH_INTEGRATION_QUEUE_NAME` The name of the Redis queue which updates to entities are published to used to decide what changes should be written to connected applications (for two-way sync between them and HASH)
- Snowplow telemetry:
  - `HASH_TELEMETRY_ENABLED`: (default: `false`) whether Snowplow is used or not. `true` or `false`.
  - `HASH_TELEMETRY_HTTPS`: (default: `false`) set to "1" to connect to the Snowplow over an HTTPS connection. `true` or `false`.
  - `HASH_TELEMETRY_DESTINATION`: (required) the hostname of the Snowplow tracker endpoint to connect to.
  - `HASH_TELEMETRY_APP_ID`: ID used to differentiate application by. Can be any string.

## Metrics

The API may output StatsD metrics to a location set by the `STATSD_HOST` and
`STATSD_PORT` environment variables. Metrics are not reported to the console
and require an external service to which they may be sent to. For development
purposes, our [Docker config](../../infra/docker/README.md) includes a bare-bones StatsD server which just outputs metrics to the console. To run the API with
this enabled, from the root of the repo, execute:

```sh
yarn serve:hash-backend-statsd
```

## Snowplow

The API may use Snowplow to collect structured behavioural data. In order to use Snowplow
the `HASH_TELEMETRY_*` environment values should be specified, most importantly
`HASH_TELEMETRY_DESTINATION` should point to a snowplow tracker endpoint and
`HASH_TELEMETRY_ENABLED=true`.

To set up a local Snowplow deployment, [Snowplow mini](https://github.com/snowplow/snowplow-mini) can be used. This requires [Vagrant](https://www.vagrantup.com/) and [VirtualBox](https://www.virtualbox.org/) to be installed.
By default, the Snowplow mini instance uses a fair bit of RAM and CPU.
Snowplow mini exposes a lot of ports to the host through the default [Vagrantfile](https://github.com/snowplow/snowplow-mini/blob/f7dbf73f1e3ba589d2dd1d8b94589c4f610dba1f/Vagrantfile). To make the instance play well wit HASH, comment out the following in the Snowplow mini Vagrantfile:

```ruby
#...
  config.vm.network "forwarded_port", guest: 80, host: 2000
  # config.vm.network "forwarded_port", guest: 3000, host: 3000
  config.vm.network "forwarded_port", guest: 4171, host: 4171
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.network "forwarded_port", guest: 8093, host: 8093
  config.vm.network "forwarded_port", guest: 9200, host: 9200
  config.vm.network "forwarded_port", guest: 5601, host: 5601
  # config.vm.network "forwarded_port", guest: 8081, host: 8081
  config.vm.network "forwarded_port", guest: 10000, host: 10000
#...
```

The default credentials for the basic auth at [http://localhost:2000/home](http://localhost:2000/home) for the local Snowplow mini instance is:

- username: USERNAME_PLACEHOLDER
- password: PASSWORD_PLACEHOLDER

With a local Snowplow deployment, the following destination can be used in the HASH env:
`HASH_TELEMETRY_DESTINATION=localhost:2000`

### Troubleshooting Vagrant/VirtualBox

On a fresh install of Vagrant/VirtualBox, some kernel modules might be unloaded for VirtualBox
which makes the `vagrant up` command error out on various steps along the way.
It might be necessary to load the following kernel modules to prevent errors:

Linux:

```sh
sudo modprobe vboxnetflt
sudo modprobe vboxnetadp
sudo modprobe vboxdrv
```

macOS:

```sh
sudo kmutil load -b org.virtualbox.kext.VBoxNetFlt
sudo kmutil load -b org.virtualbox.kext.VBoxNetAdp
sudo kmutil load -b org.virtualbox.kext.VBoxDrv
```

If you encounter an error such as
`mount.nfs: access denied by server while mounting ...`
It might be necessary to make the following changes to the Snowplow mini Vagrantfile to disable NFS.

```ruby
  # Use NFS for shared folders for better performance
  # config.vm.network :private_network, ip: '192.168.56.56' # Uncomment to use NFS
  config.vm.synced_folder '.', '/vagrant' #, nfs: true # Uncomment to use NFS
```

Here the `config.vm.network` line and the `, nfs: true` argument are commented out.

If you see `uninitialized constant VagrantPlugins::HostDarwin::Cap::Version` on MacOS, see [this issue](https://github.com/hashicorp/vagrant/issues/12583).

If you encounter an issue on the `npm install` step (5), try commenting out lines 8 & 9 of the Vagrantfile (i.e. disable using NFS for shared folders).

You may need to run `vagrant reload --provision` after applying fixes.
