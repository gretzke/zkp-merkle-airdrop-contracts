eval "$(grep ^TREE_HEIGHT= .env)"
echo 'Generating circuit for a merkle tree with height' $TREE_HEIGHT
echo 'allowing up to '$((2**$TREE_HEIGHT))' addresses to be included in the merkle tree'
sed -i'.bak' -E 's/Whitelist\([0-9]+\)/Whitelist('$TREE_HEIGHT')/g' circuits/circuit.circom